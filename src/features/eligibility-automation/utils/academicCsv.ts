import type { ImportSchema } from '../types/eligibilityAutomation.types'

export const ACADEMIC_CSV_COLUMNS = [
  { key: 'sis', label: 'SIS' },
  { key: 'nombre_completo', label: 'Nombre completo' },
  { key: 'nota_pp', label: 'Nota PP' },
  { key: 'nota_sp', label: 'Nota SP' },
  { key: 'asistencias', label: 'Asistencias' },
  { key: 'total_clases', label: 'Total de clases' },
] as const

export const ACADEMIC_CSV_HEADERS = ACADEMIC_CSV_COLUMNS.map(
  (column) => column.key,
)

const BACKEND_COLUMNS = [
  'sis',
  'assessment_key',
  'was_taken',
  'score',
  'attended_classes',
  'total_classes',
]
const ASSESSMENT_COLUMN_BY_KEY: Record<string, 'nota_pp' | 'nota_sp'> = {
  FIRST_PARTIAL: 'nota_pp',
  SECOND_PARTIAL: 'nota_sp',
}

export type AcademicCsvRow = {
  [Header in (typeof ACADEMIC_CSV_HEADERS)[number]]: string
}

export class AcademicCsvValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AcademicCsvValidationError'
  }
}

export function getAcademicCsvTemplate(): string {
  return `${ACADEMIC_CSV_HEADERS.join(',')}\r\n`
}

export function downloadAcademicCsvTemplate(): void {
  const blob = new Blob([getAcademicCsvTemplate()], {
    type: 'text/csv;charset=utf-8',
  })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = 'plantilla_datos_academicos.csv'
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export async function prepareAcademicCsv(
  file: Pick<File, 'name' | 'size' | 'arrayBuffer'>,
  schema: ImportSchema,
): Promise<{ csv: string; rows: AcademicCsvRow[] }> {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new AcademicCsvValidationError(
      'Selecciona un archivo con formato .csv.',
    )
  }
  if (file.size === 0) {
    throw new AcademicCsvValidationError('El archivo CSV está vacío.')
  }
  if (schema.max_file_kb > 0 && file.size > schema.max_file_kb * 1024) {
    throw new AcademicCsvValidationError(
      `El archivo supera el límite de ${formatSize(schema.max_file_kb * 1024)}.`,
    )
  }
  if (schema.encoding.replace(/[-_]/g, '').toUpperCase() !== 'UTF8') {
    throw new AcademicCsvValidationError(
      `El esquema de importación requiere ${schema.encoding}.`,
    )
  }
  if (schema.delimiter !== ',') {
    throw new AcademicCsvValidationError(
      'El esquema actual requiere un archivo separado por comas.',
    )
  }

  const buffer = await file.arrayBuffer()
  let content: string
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    throw new AcademicCsvValidationError(
      'El archivo no contiene texto UTF-8 válido.',
    )
  }

  const records = parseCsv(content)
  if (records.length === 0) {
    throw new AcademicCsvValidationError(
      'El archivo no contiene encabezados ni registros.',
    )
  }
  const headers = records[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim(),
  )
  if (
    headers.length !== ACADEMIC_CSV_HEADERS.length ||
    headers.some((header, index) => header !== ACADEMIC_CSV_HEADERS[index])
  ) {
    throw new AcademicCsvValidationError(
      `Las columnas deben estar en este orden: ${ACADEMIC_CSV_HEADERS.join(', ')}.`,
    )
  }

  const rows = records.slice(1).map((cells, index) => {
    const rowNumber = index + 2
    if (cells.length !== ACADEMIC_CSV_HEADERS.length) {
      throw new AcademicCsvValidationError(
        `La fila ${rowNumber} debe contener ${ACADEMIC_CSV_HEADERS.length} columnas.`,
      )
    }
    const row = {} as AcademicCsvRow
    ACADEMIC_CSV_HEADERS.forEach((header, columnIndex) => {
      row[header] = cells[columnIndex].trim()
    })
    return row
  })
  if (rows.length === 0) {
    throw new AcademicCsvValidationError(
      'Agrega al menos un registro académico al archivo.',
    )
  }
  if (schema.max_rows > 0 && rows.length > schema.max_rows) {
    throw new AcademicCsvValidationError(
      `El archivo supera el límite de ${schema.max_rows} registros.`,
    )
  }

  const backendColumns = validateBackendContract(schema)
  const trueValue = schema.was_taken_values.find(
    (value) => value.toLowerCase() === 'true',
  )
  const falseValue = schema.was_taken_values.find(
    (value) => value.toLowerCase() === 'false',
  )
  if (!trueValue || !falseValue) {
    throw new AcademicCsvValidationError(
      'El contrato actual no define valores compatibles para indicar evaluaciones rendidas.',
    )
  }

  const backendRows = rows.flatMap((row, index) => {
    const rowNumber = index + 2
    if (!row.sis) {
      throw new AcademicCsvValidationError(
        `La fila ${rowNumber} debe incluir el SIS.`,
      )
    }
    if (!row.nombre_completo) {
      throw new AcademicCsvValidationError(
        `La fila ${rowNumber} debe incluir el nombre completo.`,
      )
    }

    const ppScore = validateScore(row.nota_pp, 'Nota PP', rowNumber, schema)
    const spScore = validateScore(row.nota_sp, 'Nota SP', rowNumber, schema)
    const attended = parseNonNegativeNumber(
      row.asistencias,
      'Asistencias',
      rowNumber,
    )
    const total = parseNonNegativeNumber(
      row.total_clases,
      'Total de clases',
      rowNumber,
    )
    if (attended > total) {
      throw new AcademicCsvValidationError(
        `La fila ${rowNumber}: las asistencias no pueden superar el total de clases.`,
      )
    }
    if (!Number.isInteger(attended) || !Number.isInteger(total) || total < 1) {
      throw new AcademicCsvValidationError(
        `La fila ${rowNumber}: asistencias y total de clases deben ser enteros, y el total debe ser mayor que cero.`,
      )
    }
    const grades = { nota_pp: ppScore, nota_sp: spScore }
    if (ppScore !== '' && !schema.assessment_keys.includes('FIRST_PARTIAL')) {
      throw new AcademicCsvValidationError(
        `La fila ${rowNumber}: el esquema actual no admite Nota PP.`,
      )
    }
    if (spScore !== '' && !schema.assessment_keys.includes('SECOND_PARTIAL')) {
      throw new AcademicCsvValidationError(
        `La fila ${rowNumber}: el esquema actual no admite Nota SP.`,
      )
    }

    return schema.assessment_keys.map((assessmentKey) => {
      const scoreColumn = ASSESSMENT_COLUMN_BY_KEY[assessmentKey]
      const score = scoreColumn ? grades[scoreColumn] : ''
      const values: Record<string, string> = {
        sis: row.sis,
        assessment_key: assessmentKey,
        was_taken: score ? trueValue : falseValue,
        score,
        attended_classes: row.asistencias,
        total_classes: row.total_clases,
      }
      return backendColumns.map((column) => values[column])
    })
  })

  if (schema.max_rows > 0 && backendRows.length > schema.max_rows) {
    const maxStudents = Math.floor(
      schema.max_rows / schema.assessment_keys.length,
    )
    throw new AcademicCsvValidationError(
      `La conversión al formato de importación requiere ${schema.assessment_keys.length} filas por estudiante y supera el límite de ${schema.max_rows} filas CSV (máximo ${maxStudents} estudiantes con el esquema actual).`,
    )
  }

  const backendCsv = [
    backendColumns.join(','),
    ...backendRows.map((row) => row.map(escapeCsv).join(',')),
    '',
  ].join('\r\n')
  if (
    schema.max_file_kb > 0 &&
    new TextEncoder().encode(backendCsv).byteLength > schema.max_file_kb * 1024
  ) {
    throw new AcademicCsvValidationError(
      `La conversión al formato de importación supera el límite de ${formatSize(schema.max_file_kb * 1024)}.`,
    )
  }

  return {
    csv: backendCsv,
    rows,
  }
}

function validateBackendContract(schema: ImportSchema): string[] {
  const columns = schema.columns
  if (
    columns.length !== BACKEND_COLUMNS.length ||
    BACKEND_COLUMNS.some((column) => !columns.includes(column))
  ) {
    throw new AcademicCsvValidationError(
      'El contrato actual de importación no coincide con la plantilla académica disponible.',
    )
  }
  if (
    schema.assessment_keys.length === 0 ||
    schema.assessment_keys.length > 2 ||
    new Set(schema.assessment_keys).size !== schema.assessment_keys.length ||
    schema.assessment_keys.some(
      (key) => ASSESSMENT_COLUMN_BY_KEY[key] === undefined,
    )
  ) {
    throw new AcademicCsvValidationError(
      'El contrato actual requiere evaluaciones que no se pueden representar con las columnas Nota PP y Nota SP.',
    )
  }
  return columns
}

function validateScore(
  raw: string,
  label: string,
  rowNumber: number,
  schema: ImportSchema,
): string {
  if (raw === '') return ''
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new AcademicCsvValidationError(
      `La fila ${rowNumber}: ${label} debe ser numérica.`,
    )
  }
  if (
    (schema.score_min !== undefined && value < schema.score_min) ||
    (schema.score_max !== undefined && value > schema.score_max)
  ) {
    throw new AcademicCsvValidationError(
      `La fila ${rowNumber}: ${label} debe estar entre ${schema.score_min} y ${schema.score_max}.`,
    )
  }
  if (
    schema.score_decimal_places !== undefined &&
    (raw.split('.')[1]?.length ?? 0) > schema.score_decimal_places
  ) {
    throw new AcademicCsvValidationError(
      `La fila ${rowNumber}: ${label} admite hasta ${schema.score_decimal_places} decimales.`,
    )
  }
  return raw
}

function parseNonNegativeNumber(
  raw: string,
  label: string,
  rowNumber: number,
): number {
  const value = Number(raw)
  if (raw === '' || !Number.isFinite(value) || value < 0) {
    throw new AcademicCsvValidationError(
      `La fila ${rowNumber}: ${label} debe ser un número igual o mayor que cero.`,
    )
  }
  return value
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        cell += character
      }
      continue
    }
    if (character === '"' && cell.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(cell)
      cell = ''
    } else if (character === '\n' || character === '\r') {
      row.push(cell)
      if (row.some((value) => value.trim() !== '')) rows.push(row)
      row = []
      cell = ''
      if (character === '\r' && content[index + 1] === '\n') index += 1
    } else {
      cell += character
    }
  }
  if (quoted) {
    throw new AcademicCsvValidationError(
      'El archivo contiene un campo CSV sin comillas de cierre.',
    )
  }
  row.push(cell)
  if (row.some((value) => value.trim() !== '')) rows.push(row)
  return rows
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(0)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`
}
