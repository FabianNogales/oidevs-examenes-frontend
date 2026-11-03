import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import {
  positiveId,
  isTimestamp,
} from '@/features/infractions/utils/infractionValidation'
import type {
  AttendanceSnapshot,
  AttendanceCounts,
  AttendancePage,
  AttendanceQuery,
  AttendanceActivity,
  AttendanceList,
} from '../types/attendance.types'
export class AttendanceApiError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'AttendanceApiError'
    this.status = status
  }
}
const count = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
function invalid(): never {
  throw new AttendanceApiError(
    'El servidor no devolvió un seguimiento válido y vigente. Actualiza la consulta.',
  )
}
function counts(v: AttendanceCounts) {
  if (
    !v ||
    !count(v.total_students) ||
    !count(v.registered) ||
    !count(v.pending) ||
    v.registered + v.pending !== v.total_students ||
    typeof v.attendance_percentage !== 'number' ||
    !Number.isFinite(v.attendance_percentage) ||
    Math.abs(
      v.attendance_percentage -
        (v.total_students
          ? Math.round((v.registered * 10000) / v.total_students) / 100
          : 0),
    ) > 0.005
  )
    invalid()
}
function list(v: AttendanceList) {
  counts(v)
  if (
    !positiveId(v.id) ||
    typeof v.name !== 'string' ||
    !v.name.trim() ||
    !positiveId(v.collaborator?.id) ||
    typeof v.collaborator.name !== 'string' ||
    !v.collaborator.name.trim()
  )
    invalid()
}
function snapshot(v: AttendanceSnapshot, exam: number) {
  if (
    !v ||
    v.exam?.id !== exam ||
    typeof v.exam.name !== 'string' ||
    !v.exam.name.trim() ||
    typeof v.exam.status !== 'string' ||
    v.source !== 'SERVER' ||
    v.is_current !== true ||
    v.roster_scope !== 'ACTIVE_ENROLLMENTS' ||
    !isTimestamp(v.last_updated_at) ||
    !positiveId(v.poll_after_seconds) ||
    !v.offline ||
    typeof v.offline.available_on_server !== 'boolean' ||
    v.offline.included_in_official_attendance !== false ||
    (!v.offline.available_on_server && v.offline.pending_count !== null) ||
    (v.offline.available_on_server && !count(v.offline.pending_count)) ||
    !v.exclusive_lists ||
    typeof v.exclusive_lists.available !== 'boolean'
  )
    invalid()
  counts(v.summary)
  if (v.exclusive_lists.available) {
    if (
      !Array.isArray(v.exclusive_lists.data) ||
      new Set(v.exclusive_lists.data.map((l) => l?.id)).size !==
        v.exclusive_lists.data.length
    )
      invalid()
    v.exclusive_lists.data.forEach(list)
  }
  if (v.selected_list) list(v.selected_list)
}
function endpoint(exam: number) {
  if (!positiveId(exam))
    throw new AttendanceApiError('El identificador del examen no es válido.')
  return `/exams/${exam}/attendance`
}
function failure(e: unknown): never {
  if (e instanceof AttendanceApiError || axios.isCancel(e)) throw e
  const status = axios.isAxiosError(e) ? (e.response?.status ?? null) : null
  const messages: Record<number, string> = {
    401: 'Tu sesión expiró. Inicia sesión nuevamente.',
    403: 'Solo el docente responsable autorizado puede supervisar este examen.',
    404: 'No se encontró el seguimiento o aún no está disponible en el servidor.',
    422: 'Revisa los filtros de asistencia.',
    501: 'El seguimiento aún no está disponible en el servidor.',
    503: 'No se pudo recuperar la asistencia vigente. Actualiza la consulta.',
  }
  throw new AttendanceApiError(
    (status && messages[status]) ||
      'No se pudo confirmar la asistencia vigente. Comprueba la conexión y actualiza.',
    status,
  )
}
export function validateAttendanceQuery(q: AttendanceQuery) {
  if (
    !q ||
    !['all', 'registered', 'pending'].includes(q.view) ||
    typeof q.search !== 'string' ||
    q.search.trim().length > 255 ||
    !positiveId(q.page) ||
    (q.list_id !== undefined && !positiveId(q.list_id))
  )
    throw new AttendanceApiError(
      'Los filtros de asistencia no son válidos.',
      422,
    )
}
export async function getAttendanceStudents(
  exam: number,
  q: AttendanceQuery,
  signal?: AbortSignal,
): Promise<AttendancePage> {
  const url = endpoint(exam)
  validateAttendanceQuery(q)
  try {
    const { data: v } = await httpClient.get<AttendancePage>(
      `${url}/students`,
      { params: { ...q, search: q.search.trim(), per_page: 10 }, signal },
    )
    snapshot(v, exam)
    const m = v.meta
    if (
      !Array.isArray(v.data) ||
      !m ||
      m.current_page !== q.page ||
      m.per_page !== 10 ||
      !positiveId(m.last_page) ||
      !count(m.total) ||
      m.last_page !== Math.max(1, Math.ceil(m.total / m.per_page)) ||
      v.data.length !==
        Math.min(
          m.per_page,
          Math.max(0, m.total - (q.page - 1) * m.per_page),
        ) ||
      new Set(v.data.map((s) => s?.student_id)).size !== v.data.length
    )
      invalid()
    if (
      q.list_id &&
      (!v.exclusive_lists.available || v.selected_list?.id !== q.list_id)
    )
      invalid()
    if (!q.list_id && v.selected_list) invalid()
    const scope = v.selected_list ?? v.summary
    const expectedTotal =
      q.view === 'registered'
        ? scope.registered
        : q.view === 'pending'
          ? scope.pending
          : scope.total_students
    if (
      (!q.search.trim() && m.total !== expectedTotal) ||
      m.total > scope.total_students ||
      (q.view === 'registered' && m.total > scope.registered) ||
      (q.view === 'pending' && m.total > scope.pending)
    )
      invalid()
    for (const s of v.data) {
      if (
        !s ||
        !positiveId(s.student_id) ||
        typeof s.first_names !== 'string' ||
        typeof s.last_names !== 'string' ||
        typeof s.sis_code !== 'string' ||
        (s.identity_number !== null && typeof s.identity_number !== 'string') ||
        typeof s.student_status !== 'string' ||
        !['SERVER_CONFIRMED', 'PENDING'].includes(s.attendance_status) ||
        (q.view === 'registered' &&
          s.attendance_status !== 'SERVER_CONFIRMED') ||
        (q.view === 'pending' && s.attendance_status !== 'PENDING')
      )
        invalid()
      if (s.attendance_status === 'PENDING') {
        if (s.entry !== null) invalid()
      } else if (
        !s.entry ||
        !positiveId(s.entry.id) ||
        !positiveId(s.entry.verified_by) ||
        !isTimestamp(s.entry.entered_at) ||
        !['QR', 'MANUAL'].includes(s.entry.verification_method)
      )
        invalid()
    }
    return v
  } catch (e) {
    return failure(e)
  }
}
export async function getAttendanceActivity(
  exam: number,
  signal?: AbortSignal,
): Promise<AttendanceActivity> {
  const url = endpoint(exam)
  try {
    const { data: v } = await httpClient.get<AttendanceActivity>(
      `${url}/collaborators`,
      { signal },
    )
    snapshot(v, exam)
    const c = v.collaborators
    if (
      !c ||
      typeof c.available !== 'boolean' ||
      c.metric !== 'VALID_ENTRIES_VERIFIED_BY_USER' ||
      typeof c.progress_by_assigned_list_available !== 'boolean' ||
      !Array.isArray(c.data) ||
      new Set(c.data.map((r) => r?.user_id)).size !== c.data.length ||
      (!c.available && c.data.length)
    )
      invalid()
    for (const r of c.data) {
      if (
        !r ||
        !positiveId(r.user_id) ||
        typeof r.name !== 'string' ||
        !r.name.trim() ||
        ![
          'RESPONSIBLE_TEACHER',
          'COLLABORATOR',
          'HISTORICAL_VERIFIER',
        ].includes(r.role) ||
        !count(r.valid_registered) ||
        (r.assignment_status !== null &&
          typeof r.assignment_status !== 'string')
      )
        invalid()
      if (
        !c.progress_by_assigned_list_available &&
        (r.assigned_total !== null ||
          r.pending !== null ||
          r.attendance_percentage !== null)
      )
        invalid()
      if (c.progress_by_assigned_list_available)
        counts({
          total_students: r.assigned_total!,
          registered: r.valid_registered,
          pending: r.pending!,
          attendance_percentage: r.attendance_percentage!,
        })
    }
    if (
      c.available &&
      c.data.reduce((sum, r) => sum + r.valid_registered, 0) !==
        v.summary.registered
    )
      invalid()
    return v
  } catch (e) {
    return failure(e)
  }
}
