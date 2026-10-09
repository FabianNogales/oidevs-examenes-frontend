import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type {
  SubjectImportPreview,
  SubjectImportConfirmation,
  SubjectImportRow,
} from '../types/subjectImport.types'

export class SubjectImportError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'SubjectImportError'
    this.status = status
  }
}
function mapError(error: unknown): SubjectImportError {
  if (error instanceof SubjectImportError) return error
  if (!axios.isAxiosError(error))
    return new SubjectImportError(
      'El servidor devolvió un reporte inválido. Reintenta con la misma vista previa para consultar el resultado.',
    )
  const status = error.response?.status ?? null
  const fileErrors = error.response?.data?.errors?.file
  const fileError =
    Array.isArray(fileErrors) && typeof fileErrors[0] === 'string'
      ? fileErrors[0]
      : null
  const message =
    status === null
      ? 'No se pudo conectar con el servidor. Puedes reintentar la operación.'
      : status === 403
        ? 'No tienes permisos para importar materias.'
        : status === 404 || status === 501
          ? 'La importación de materias aún no está disponible en el servidor.'
          : status === 409 || status === 410
            ? 'La vista previa ya no está disponible. Vuelve a validar el archivo.'
            : status === 413
              ? 'El archivo supera el tamaño permitido por el servidor.'
              : status === 422
                ? (fileError ??
                  'El archivo no cumple el formato esperado. Revisa la plantilla CSV.')
                : 'No se pudo procesar el archivo. Inténtalo nuevamente.'
  return new SubjectImportError(message, status)
}

function validRows(rows: SubjectImportRow[], confirmed: boolean): boolean {
  if (!Array.isArray(rows)) return false
  const unique = new Set<number>()
  return rows.every((row) => {
    if (
      !row ||
      !Number.isSafeInteger(row.row_number) ||
      row.row_number < 2 ||
      unique.has(row.row_number) ||
      !(
        confirmed
          ? ['IMPORTED', 'ERROR', 'OMITTED']
          : ['VALID', 'ERROR', 'OMITTED']
      ).includes(row.status) ||
      !Array.isArray(row.errors) ||
      !row.errors.every((error) => typeof error === 'string') ||
      (row.status === 'ERROR' && !row.errors.length) ||
      (['VALID', 'IMPORTED'].includes(row.status) && row.errors.length > 0) ||
      (row.status === 'IMPORTED' &&
        (!Number.isSafeInteger(row.subject_id) ||
          (row.subject_id ?? 0) <= 0)) ||
      !row.data ||
      ['codigo_materia', 'nombre_materia', 'codigo_carrera'].some(
        (key) => typeof row.data[key as keyof typeof row.data] !== 'string',
      )
    )
      return false
    unique.add(row.row_number)
    return true
  })
}
export function isSubjectImportReport(
  value: unknown,
  confirmed: boolean,
): boolean {
  if (!value || typeof value !== 'object') return false
  const report = value as SubjectImportPreview & SubjectImportConfirmation
  if (
    !validRows(report.rows, confirmed) ||
    typeof report.preview_id !== 'string' ||
    !report.preview_id.trim() ||
    !report.summary
  )
    return false
  const { summary, rows } = report
  const ready = confirmed ? summary.imported : summary.valid
  const errors = confirmed ? summary.failed : summary.invalid
  return (
    [summary.total, ready, errors, summary.omitted].every(
      (count) => Number.isSafeInteger(count) && count >= 0,
    ) &&
    summary.total === rows.length &&
    ready + errors + summary.omitted === summary.total &&
    rows.filter((row) => row.status === (confirmed ? 'IMPORTED' : 'VALID'))
      .length === ready &&
    rows.filter((row) => row.status === 'ERROR').length === errors &&
    rows.filter((row) => row.status === 'OMITTED').length === summary.omitted &&
    (confirmed ||
      (typeof report.expires_at === 'string' &&
        Number.isFinite(Date.parse(report.expires_at))))
  )
}
function formData(file: File, previewId?: string) {
  const data = new FormData()
  data.append('file', file)
  if (previewId) data.append('preview_id', previewId)
  return data
}
export async function previewSubjectImport(
  file: File,
  signal: AbortSignal,
): Promise<SubjectImportPreview> {
  try {
    const response = await httpClient.post(
      '/admin/subjects/import/preview',
      formData(file),
      { signal },
    )
    const report = response.data?.data
    if (!isSubjectImportReport(report, false))
      throw new SubjectImportError(
        'El servidor devolvió una vista previa inválida. Vuelve a validar el archivo.',
      )
    return report
  } catch (error) {
    throw mapError(error)
  }
}
export async function confirmSubjectImport(
  file: File,
  previewId: string,
  signal: AbortSignal,
): Promise<SubjectImportConfirmation> {
  try {
    const response = await httpClient.post(
      '/admin/subjects/import/confirm',
      formData(file, previewId),
      { signal },
    )
    const report = response.data?.data
    if (!isSubjectImportReport(report, true) || report.preview_id !== previewId)
      throw new SubjectImportError(
        'No se pudo verificar la importación. Reintenta con la misma vista previa para consultar su resultado.',
      )
    return report
  } catch (error) {
    throw mapError(error)
  }
}
