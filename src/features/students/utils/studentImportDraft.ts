import { useSyncExternalStore } from 'react'
import type { AuthenticatedUser } from '@/features/auth/types/auth'
import type { StudentImportPreview, StudentImportPreviewRow } from '@/features/students/types/studentImport'

export const STUDENT_IMPORT_DRAFT_KEY = 'eida_student_import_draft_v1'
export const STUDENT_IMPORT_DRAFT_TTL = 60 * 60 * 1000
const LEGACY_KEY = 'eida_last_import_preview'
const INVALIDATION_KEY = 'eida_hu05_invalidation'
// Bound parsing/serialization independently of browser quota; an oversized draft remains in memory only.
const MAX_RECORD_LENGTH = 16 * 1024 * 1024
const COLUMNS = ['sis_code', 'identity_number', 'first_names', 'last_names', 'email', 'career', 'profile_photo'] as const

export type StudentImportDraft = {
  version: 1
  ownerId: number
  createdAt: number
  expiresAt: number
  preview: StudentImportPreview
}
export type StudentImportContext = { ownerId: number; generation: number }
let ownerId: number | null = null
let generation = 0
let draft: StudentImportDraft | null = null
let expiryTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const invalidationListeners = new Set<() => void>()

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function messages(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 128 && value.every((item) => typeof item === 'string')
}

// Copy an allowlist: results, student_id, arbitrary fields and credentials never enter the draft.
export function sanitizeStudentImportPreview(value: unknown): StudentImportPreview | null {
  if (!object(value) || typeof value.valid !== 'boolean' || !count(value.total_rows) ||
    !count(value.valid_rows) || !count(value.error_rows) || !messages(value.errors) ||
    !Array.isArray(value.rows) || value.rows.length !== value.total_rows ||
    value.rows.length > MAX_RECORD_LENGTH / 100) return null
  const rows: StudentImportPreviewRow[] = []
  const seen = new Set<number>()
  let validRows = 0
  for (const row of value.rows) {
    if (!object(row) || !count(row.row) || row.row < 2 || seen.has(row.row) ||
      typeof row.valid !== 'boolean' || !messages(row.errors) || row.valid !== (row.errors.length === 0) ||
      !object(row.data)) return null
    const data = row.data
    if (!COLUMNS.every((column) => typeof data[column] === 'string')) return null
    seen.add(row.row)
    if (row.valid) validRows++
    rows.push({ row: row.row, valid: row.valid, errors: [...row.errors], data: {
      sis_code: data.sis_code as string, identity_number: data.identity_number as string,
      first_names: data.first_names as string, last_names: data.last_names as string,
      email: data.email as string, career: data.career as string, profile_photo: data.profile_photo as string,
    } })
  }
  if (validRows !== value.valid_rows || value.total_rows !== value.valid_rows + value.error_rows ||
    value.valid !== (value.error_rows === 0 && value.errors.length === 0)) return null
  return { valid: value.valid, total_rows: value.total_rows, valid_rows: value.valid_rows,
    error_rows: value.error_rows, errors: [...value.errors], rows }
}

export function removeLegacyStudentImportPreview() {
  try { localStorage.removeItem(LEGACY_KEY) } catch { /* Storage may be disabled. */ }
}
function publish(next: StudentImportDraft | null) {
  if (expiryTimer !== undefined) clearTimeout(expiryTimer)
  draft = next
  if (next) expiryTimer = setTimeout(() => {
    if (draft === next && Date.now() >= next.expiresAt) clearStudentImportDraft()
  }, Math.max(0, next.expiresAt - Date.now()))
  listeners.forEach((listener) => listener())
}
export function clearStudentImportDraft() {
  try { sessionStorage.removeItem(STUDENT_IMPORT_DRAFT_KEY) } catch { /* Fail closed in memory too. */ }
  publish(null)
}
export function captureStudentImportContext(): StudentImportContext | null {
  return ownerId === null ? null : { ownerId, generation }
}
export function isCurrentStudentImportContext(context: StudentImportContext | null): boolean {
  return context !== null && context.ownerId === ownerId && context.generation === generation
}
export function invalidateStudentImportSession(broadcast = true) {
  ownerId = null
  generation++
  removeLegacyStudentImportPreview()
  clearStudentImportDraft()
  invalidationListeners.forEach((listener) => listener())
  if (broadcast) {
    // A signal only: no user id, preview, credentials or session identifier.
    try {
      localStorage.setItem(INVALIDATION_KEY, crypto.randomUUID())
      localStorage.removeItem(INVALIDATION_KEY)
    } catch { /* Local invalidation still applies. */ }
  }
}
export function subscribeStudentImportInvalidation(listener: () => void) {
  invalidationListeners.add(listener)
  return () => { invalidationListeners.delete(listener) }
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function useStudentImportDraft() {
  return useSyncExternalStore(subscribe, () => draft, () => null)
}
export function useStudentImportContextVersion() {
  return useSyncExternalStore(subscribe, () => generation, () => generation)
}

export function readStudentImportDraft(): StudentImportDraft | null {
  removeLegacyStudentImportPreview()
  if (ownerId === null) return null
  try {
    const raw = sessionStorage.getItem(STUDENT_IMPORT_DRAFT_KEY)
    if (!raw) { if (draft) publish(null); return null }
    if (raw.length > MAX_RECORD_LENGTH) throw new Error('Oversized draft')
    const value: unknown = JSON.parse(raw)
    const now = Date.now()
    if (!object(value) || value.version !== 1 || value.ownerId !== ownerId ||
      !count(value.createdAt) || !count(value.expiresAt) || value.createdAt > now ||
      value.expiresAt !== value.createdAt + STUDENT_IMPORT_DRAFT_TTL || now >= value.expiresAt) throw new Error('Invalid draft')
    const preview = sanitizeStudentImportPreview(value.preview)
    if (!preview) throw new Error('Invalid preview')
    const next: StudentImportDraft = { version: 1, ownerId, createdAt: value.createdAt, expiresAt: value.expiresAt, preview }
    const clean = JSON.stringify(next)
    if (clean !== raw) sessionStorage.setItem(STUDENT_IMPORT_DRAFT_KEY, clean)
    if (!draft || JSON.stringify(draft) !== clean) publish(next)
    return draft
  } catch { clearStudentImportDraft(); return null }
}
export function setStudentImportIdentity(user: AuthenticatedUser | null) {
  removeLegacyStudentImportPreview()
  const next = user && count(user.id) && user.id > 0 && user.status === 'ACTIVE' &&
    !user.must_change_password && user.roles.includes('ADMINISTRADOR') ? user.id : null
  if (ownerId !== next) {
    if (ownerId !== null || next === null) invalidateStudentImportSession()
    ownerId = next
    generation++
  }
  if (next === null) clearStudentImportDraft()
  else readStudentImportDraft()
  listeners.forEach((listener) => listener())
}
export function saveStudentImportDraft(value: unknown, context: StudentImportContext | null): StudentImportDraft | null {
  if (!isCurrentStudentImportContext(context) || !context) return null
  const preview = sanitizeStudentImportPreview(value)
  if (!preview) { clearStudentImportDraft(); return null }
  const createdAt = Date.now()
  const next: StudentImportDraft = { version: 1, ownerId: context.ownerId, createdAt,
    expiresAt: createdAt + STUDENT_IMPORT_DRAFT_TTL, preview }
  try {
    const raw = JSON.stringify(next)
    if (raw.length > MAX_RECORD_LENGTH) throw new Error('Oversized draft')
    sessionStorage.setItem(STUDENT_IMPORT_DRAFT_KEY, raw)
    publish(next)
    return next
  } catch { clearStudentImportDraft(); return null }
}

export function startStudentImportSessionSync(onRemoteInvalidation: () => void) {
  removeLegacyStudentImportPreview()
  // Opener-created tabs may inherit sessionStorage. Never deliberately resume that copy.
  const navigation = window.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (window.opener && navigation?.type !== 'reload' && navigation?.type !== 'back_forward') clearStudentImportDraft()
  const onStorage = (event: StorageEvent) => {
    if (event.key === INVALIDATION_KEY && event.newValue !== null) {
      invalidateStudentImportSession(false)
      onRemoteInvalidation()
    }
  }
  const onFocus = () => { readStudentImportDraft() }
  window.addEventListener('storage', onStorage)
  window.addEventListener('focus', onFocus)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('focus', onFocus)
  }
}
