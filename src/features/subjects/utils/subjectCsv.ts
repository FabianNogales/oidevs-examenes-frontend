import type { SubjectCsvData } from '../types/subjectImport.types'

export const SUBJECT_CSV_COLUMNS: {
  header: string
  key: keyof SubjectCsvData
  label: string
}[] = [
  {
    header: 'codigo_materia',
    key: 'codigo_materia',
    label: 'Código de materia',
  },
  {
    header: 'nombre_materia',
    key: 'nombre_materia',
    label: 'Nombre de materia',
  },
  {
    header: 'codigo_carrera',
    key: 'codigo_carrera',
    label: 'Código de carrera',
  },
]
const CSV_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
])

export function getSubjectFileError(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.csv'))
    return 'Selecciona un archivo con extensión .csv.'
  if (file.type && !CSV_TYPES.has(file.type))
    return 'El archivo seleccionado no parece ser un CSV válido.'
  if (!file.size) return 'El archivo CSV está vacío.'
  if (file.size > 10 * 1024 * 1024)
    return 'El archivo supera el tamaño máximo permitido de 10 MB.'
  return null
}

export async function validateSubjectCsv(file: File): Promise<string | null> {
  const fileError = getSubjectFileError(file)
  if (fileError) return fileError
  let decoded: string
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(
      await file.arrayBuffer(),
    )
  } catch {
    return 'Guarda el archivo CSV con codificación UTF-8 e inténtalo nuevamente.'
  }
  const content = decoded.replace(/^\uFEFF/u, '').trim()
  if (!content) return 'El archivo CSV está vacío.'
  if (content.includes('\uFFFD'))
    return 'Guarda el archivo CSV con codificación UTF-8 e inténtalo nuevamente.'
  const [header, ...lines] = content.split(/\r?\n/u)
  const headers = header.split(',').map((value) =>
    value
      .trim()
      .replace(/^"(.*)"$/u, '$1')
      .trim(),
  )
  if (
    headers.length !== SUBJECT_CSV_COLUMNS.length ||
    SUBJECT_CSV_COLUMNS.some(
      (column, index) => headers[index] !== column.header,
    )
  ) {
    return `Los encabezados deben ser: ${SUBJECT_CSV_COLUMNS.map((column) => column.header).join(',')}. Usa la plantilla CSV.`
  }
  if (!lines.some((line) => line.trim()))
    return 'El archivo debe contener al menos una fila de materias además de los encabezados.'
  return null
}

export function downloadSubjectCsvTemplate() {
  const blob = new Blob(
    [
      '\uFEFF' +
        SUBJECT_CSV_COLUMNS.map((column) => column.header).join(',') +
        '\r\n',
    ],
    { type: 'text/csv;charset=utf-8' },
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla_materias.csv'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function formatSubjectFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
