import { httpClient } from '@/shared/api/httpClient'
import {
  mapOfferingMutationError,
  OfferingMutationError,
} from './offeringMutationsApi'
import type {
  OfferingImportPreview,
  OfferingImportConfirmation,
} from '../types/offeringImport.types'

export function isOfferingImportReport(
  value: unknown,
  confirmed: boolean,
  termId: number,
): boolean {
  if (!value || typeof value !== 'object') return false
  const report = value as OfferingImportPreview & OfferingImportConfirmation
  if (
    typeof report.preview_id !== 'string' ||
    !report.preview_id.trim() ||
    report.academic_term_id !== termId ||
    !report.summary ||
    !Array.isArray(report.rows)
  )
    return false
  const unique = new Set<number>()
  if (
    !report.rows.every((row) => {
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
        !row.data ||
        typeof row.data.correo_docente !== 'string' ||
        typeof row.data.codigo_materia !== 'string' ||
        !Array.isArray(row.errors) ||
        !row.errors.every((error) => typeof error === 'string') ||
        (['ERROR', 'OMITTED'].includes(row.status) &&
          row.errors.length === 0) ||
        (['VALID', 'IMPORTED'].includes(row.status) && row.errors.length > 0) ||
        (row.status === 'IMPORTED' &&
          (!Number.isSafeInteger(row.course_offering_id) ||
            (row.course_offering_id ?? 0) <= 0))
      )
        return false
      unique.add(row.row_number)
      return true
    })
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
function data(file: File, termId: number, previewId?: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('academic_term_id', String(termId))
  if (previewId) form.append('preview_id', previewId)
  return form
}
export async function previewOfferingImport(
  file: File,
  termId: number,
  signal: AbortSignal,
): Promise<OfferingImportPreview> {
  try {
    const report = (
      await httpClient.post(
        '/admin/course-offerings/import/preview',
        data(file, termId),
        { signal },
      )
    ).data?.data
    if (!isOfferingImportReport(report, false, termId))
      throw new OfferingMutationError(
        'La vista previa devuelta por el servidor es inválida. Vuelve a validar el archivo.',
      )
    return report
  } catch (error) {
    throw mapOfferingMutationError(error)
  }
}
export async function confirmOfferingImport(
  file: File,
  termId: number,
  previewId: string,
  signal: AbortSignal,
): Promise<OfferingImportConfirmation> {
  try {
    const report = (
      await httpClient.post(
        '/admin/course-offerings/import/confirm',
        data(file, termId, previewId),
        { signal },
      )
    ).data?.data
    if (
      !isOfferingImportReport(report, true, termId) ||
      report.preview_id !== previewId
    )
      throw new OfferingMutationError(
        'No se pudo verificar el resultado. Reintenta con la misma vista previa; no vuelvas a validar todavía.',
      )
    return report
  } catch (error) {
    throw mapOfferingMutationError(error)
  }
}
