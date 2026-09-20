import { STUDENT_IMPORT_COLUMNS } from '@/features/students/utils/studentImportColumns'
import type { CsvValidationResult } from '@/features/students/types/studentImport'

const CSV_EXTENSION = '.csv'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const TRUSTED_CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
])

export function validateStudentImportFile(file: File): CsvValidationResult {
  if (!file.name.toLowerCase().endsWith(CSV_EXTENSION)) {
    return {
      isValid: false,
      message: 'Selecciona un archivo con extension .csv.',
    }
  }

  if (file.type && !TRUSTED_CSV_MIME_TYPES.has(file.type)) {
    return {
      isValid: false,
      message: 'El archivo seleccionado no parece ser un CSV valido.',
    }
  }

  if (file.size === 0) {
    return {
      isValid: false,
      message: 'El archivo CSV esta vacio.',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      message: 'El archivo supera el tamano maximo permitido de 10 MB.',
    }
  }

  return { isValid: true }
}

export async function validateStudentImportCsv(
  file: File,
): Promise<CsvValidationResult> {
  const fileValidation = validateStudentImportFile(file)

  if (!fileValidation.isValid) {
    return fileValidation
  }

  const content = await file.text()

  if (!content.trim()) {
    return {
      isValid: false,
      message: 'El archivo CSV esta vacio.',
    }
  }

  const headerLine = content
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0)

  if (!headerLine) {
    return {
      isValid: false,
      message: 'No se encontraron encabezados en el CSV.',
    }
  }

  const headers = parseCsvRow(headerLine).map(normalizeHeader)
  const expectedHeaders = STUDENT_IMPORT_COLUMNS.map(normalizeHeader)

  if (headers.length <= 1 && STUDENT_IMPORT_COLUMNS.length > 1) {
    return {
      isValid: false,
      message: 'El archivo no parece tener una estructura CSV valida.',
    }
  }

  if (!headersMatchExpected(headers, expectedHeaders)) {
    return {
      isValid: false,
      message: `Los encabezados deben ser exactamente: ${STUDENT_IMPORT_COLUMNS.join(', ')}.`,
    }
  }

  return { isValid: true }
}

function headersMatchExpected(headers: string[], expectedHeaders: string[]): boolean {
  if (headers.length !== expectedHeaders.length) {
    return false
  }

  return expectedHeaders.every((header, index) => headers[index] === header)
}

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase()
}

function parseCsvRow(row: string): string[] {
  const cells: string[] = []
  let currentCell = ''
  let insideQuotes = false

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index]
    const nextCharacter = row[index + 1]

    if (character === '"' && nextCharacter === '"') {
      currentCell += character
      index += 1
      continue
    }

    if (character === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (character === ',' && !insideQuotes) {
      cells.push(currentCell)
      currentCell = ''
      continue
    }

    currentCell += character
  }

  cells.push(currentCell)

  return cells
}
