import { getSubjectFileError } from '@/features/subjects/utils/subjectCsv'
import type {
  OfferingImportPreview,
  OfferingImportConfirmation,
} from '../types/offeringImport.types'

export const OFFERING_CSV_HEADERS = [
  'correo_docente',
  'codigo_materia',
] as const
export const getOfferingFileError = getSubjectFileError

export async function validateOfferingCsv(file: File): Promise<string | null> {
  const error = getOfferingFileError(file)
  if (error) return error
  let decoded: string
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(
      await file.arrayBuffer(),
    )
  } catch {
    return 'Guarda el CSV con codificación UTF-8 e inténtalo nuevamente.'
  }
  const content = decoded.replace(/^\uFEFF/u, '').trim()
  const [header, ...lines] = content.split(/\r?\n/u)
  const fields = header.split(',').map((value) =>
    value
      .trim()
      .replace(/^"(.*)"$/u, '$1')
      .trim(),
  )
  if (
    fields.length !== OFFERING_CSV_HEADERS.length ||
    OFFERING_CSV_HEADERS.some((value, index) => fields[index] !== value)
  )
    return `Los encabezados deben ser: ${OFFERING_CSV_HEADERS.join(',')}. El periodo se selecciona en la pantalla.`
  if (!lines.some((line) => line.trim()))
    return 'El CSV debe contener al menos una asignación.'
  return null
}
function download(content: string, name: string) {
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function downloadOfferingTemplate() {
  download(
    OFFERING_CSV_HEADERS.join(',') + '\r\n',
    'plantilla_asignaciones.csv',
  )
}
export function downloadOfferingReport(
  report: OfferingImportPreview | OfferingImportConfirmation,
) {
  const escape = (value: string | number) =>
    '"' +
    String(value)
      .replace(/^[\t\r\n ]*[=+@-]/u, "'$&")
      .replaceAll('"', '""') +
    '"'
  const rows = [
    ['fila', ...OFFERING_CSV_HEADERS, 'periodo_id', 'estado', 'observaciones'],
    ...report.rows.map((row) => [
      row.row_number,
      row.data.correo_docente,
      row.data.codigo_materia,
      report.academic_term_id,
      row.status,
      row.errors.join(' | '),
    ]),
  ]
  download(
    rows.map((row) => row.map(escape).join(',')).join('\r\n'),
    'reporte_asignaciones.csv',
  )
}
