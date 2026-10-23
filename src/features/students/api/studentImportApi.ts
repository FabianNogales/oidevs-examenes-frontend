import axios from 'axios'

import { httpClient } from '@/shared/api/httpClient'
import type {
  StudentImportConfirmation,
  StudentImportPreview,
} from '@/features/students/types/studentImport'

const STUDENT_IMPORT_PREVIEW_ENDPOINT = '/admin/students/import/preview'
const STUDENT_IMPORT_CONFIRM_ENDPOINT = '/admin/students/import/confirm'
const COLUMNS = ['sis_code', 'identity_number', 'first_names', 'last_names', 'email', 'career', 'profile_photo']

export class StudentImportError extends Error {
  readonly outcome: 'rejected' | 'unknown'

  constructor(outcome: 'rejected' | 'unknown', message: string) {
    super(message)
    this.outcome = outcome
    this.name = 'StudentImportError'
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isMessages(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isPreview(value: unknown): value is StudentImportPreview & Record<string, unknown> {
  if (!isObject(value) || typeof value.valid !== 'boolean' ||
    !isCount(value.total_rows) || !isCount(value.valid_rows) || !isCount(value.error_rows) ||
    !isMessages(value.errors) || !Array.isArray(value.rows)) return false

  const lineNumbers = new Set<number>()
  let validRows = 0
  for (const row of value.rows) {
    if (!isObject(row) || !isCount(row.row) || row.row < 2 || lineNumbers.has(row.row) ||
      typeof row.valid !== 'boolean' || !isMessages(row.errors) || !isObject(row.data)) return false
    const data = row.data
    if (!COLUMNS.every((column) => typeof data[column] === 'string') ||
      row.valid !== (row.errors.length === 0)) return false
    lineNumbers.add(row.row)
    if (row.valid) validRows++
  }
  return value.total_rows === value.rows.length &&
    value.total_rows === value.valid_rows + value.error_rows && value.valid_rows === validRows &&
    value.valid === (value.error_rows === 0 && value.errors.length === 0)
}

function responseData(body: unknown): unknown {
  if (!isObject(body) || body.success !== true || typeof body.message !== 'string') return undefined
  return body.data
}

function isStructuralRejection(data: StudentImportPreview): boolean {
  return !data.valid && data.total_rows === 0 && data.errors.length > 0
}

function parseConfirmation(body: unknown): StudentImportConfirmation {
  const data = responseData(body)
  if (!isPreview(data)) throw unknownResult()

  // Global file rejection has no rows to persist. Do not require a normal results envelope here.
  if (isStructuralRejection(data) && isObject(data) &&
    ['imported_rows', 'skipped_rows', 'failed_rows'].every((key) => data[key] === undefined || data[key] === 0) &&
    (data.results === undefined || (Array.isArray(data.results) && data.results.length === 0))) {
    throw new StudentImportError('rejected', data.errors.join(' '))
  }

  if (!isConfirmation(data)) throw unknownResult()
  return data
}

function isConfirmation(
  data: StudentImportPreview & Record<string, unknown>,
): data is StudentImportConfirmation & Record<string, unknown> {
  if (!isObject(data) || !isCount(data.imported_rows) || !isCount(data.skipped_rows) ||
    !isCount(data.failed_rows) || !Array.isArray(data.results) || !isMessages(data.warnings) ||
    (data.audit_status !== 'RECORDED' && data.audit_status !== 'FAILED') ||
    data.total_rows !== data.imported_rows + data.skipped_rows + data.failed_rows ||
    data.skipped_rows !== data.error_rows || data.valid_rows !== data.imported_rows + data.failed_rows ||
    data.results.length !== data.total_rows) return false

  const rows = new Map(data.rows.map((row) => [row.row, row]))
  const seen = new Set<number>()
  const studentIds = new Set<number>()
  const counts = { IMPORTED: 0, SKIPPED: 0, FAILED: 0 }
  for (const result of data.results) {
    if (!isObject(result) || !isCount(result.row) || result.row < 2 || seen.has(result.row) ||
      typeof result.sis_code !== 'string' || !isMessages(result.errors) ||
      (result.status !== 'IMPORTED' && result.status !== 'SKIPPED' && result.status !== 'FAILED')) return false
    const source = rows.get(result.row)
    if (!source || source.data.sis_code !== result.sis_code ||
      (result.status === 'SKIPPED') === source.valid) return false
    if (result.status === 'IMPORTED') {
      if (!isCount(result.student_id) || result.student_id === 0 || studentIds.has(result.student_id) ||
        result.errors.length !== 0) return false
      studentIds.add(result.student_id)
    } else if (result.student_id !== null || result.errors.length === 0) return false
    seen.add(result.row)
    counts[result.status]++
  }
  return counts.IMPORTED === data.imported_rows && counts.SKIPPED === data.skipped_rows &&
    counts.FAILED === data.failed_rows
}

function buildStudentImportFormData(file: File): FormData {
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

export async function previewStudentImport(file: File): Promise<StudentImportPreview> {
  const response = await httpClient.post<unknown>(STUDENT_IMPORT_PREVIEW_ENDPOINT, buildStudentImportFormData(file))
  const data = responseData(response.data)
  if (!isPreview(data)) throw new Error('La respuesta de previsualización no es compatible. No se ha confirmado la importación.')
  return data
}

export async function confirmStudentImport(file: File): Promise<StudentImportConfirmation> {
  try {
    const response = await httpClient.post<unknown>(STUDENT_IMPORT_CONFIRM_ENDPOINT, buildStudentImportFormData(file))
    return parseConfirmation(response.data)
  } catch (error) {
    if (error instanceof StudentImportError) throw error
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const messages = validationMessages(error.response?.data)
      if (status === 422 && messages.length > 0) throw new StudentImportError('rejected', messages.join(' '))
      if (status === 401 || status === 403 || status === 419) {
        throw new StudentImportError('rejected', status === 403
          ? 'No tienes autorización para importar estudiantes.'
          : 'La sesión no permite confirmar la importación. Vuelve a iniciar sesión.')
      }
    }
    throw unknownResult()
  }
}

function unknownResult(): StudentImportError {
  return new StudentImportError('unknown',
    'No se recibió una confirmación confiable. Algunas filas podrían haberse creado. Revisa Gestión de estudiantes antes de iniciar otra importación. No se reenviará el archivo automáticamente.')
}

function validationMessages(body: unknown): string[] {
  if (!isObject(body) || !isObject(body.errors)) return []
  const values = Object.values(body.errors)
  return values.length > 0 && values.every(isMessages) ? values.flat() : []
}

export function getStudentImportErrorMessage(error: unknown): string {
  if (error instanceof StudentImportError) return error.message
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) return 'No tienes autorización para importar estudiantes.'
    if (error.response?.status === 422) {
      const messages = validationMessages(error.response.data)
      if (messages.length > 0) return messages.join(' ')
    }
  } else if (error instanceof Error) return error.message
  return 'No pudimos procesar este archivo. Verifica que utilice la plantilla CSV indicada e inténtalo nuevamente.'
}

export function getStudentImportOutcome(result: StudentImportConfirmation) {
  const kind = result.imported_rows === 0 ? 'none'
    : result.skipped_rows > 0 || result.failed_rows > 0 ? 'partial' : 'complete'
  return {
    kind,
    title: kind === 'complete' ? 'Importación completa'
      : kind === 'partial' ? 'Importación parcial' : 'Sin estudiantes creados',
    message: `Procesados: ${result.total_rows}. Importados: ${result.imported_rows}. Omitidos: ${result.skipped_rows}. Fallidos: ${result.failed_rows}.`,
    auditWarning: result.audit_status === 'FAILED' || result.warnings.length > 0,
  }
}
