import { STUDENT_IMPORT_COLUMNS } from '@/features/students/utils/studentImportColumns'
import type { CsvValidationResult } from '@/features/students/types/studentImport'

const CSV_EXTENSION = '.csv'
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
  const missingHeaders = STUDENT_IMPORT_COLUMNS.filter(
    (column) => !headers.includes(normalizeHeader(column)),
  )

  if (headers.length <= 1 && STUDENT_IMPORT_COLUMNS.length > 1) {
    return {
      isValid: false,
      message: 'El archivo no parece tener una estructura CSV valida.',
    }
  }

  if (missingHeaders.length > 0) {
    return {
      isValid: false,
      message: `Faltan columnas requeridas: ${missingHeaders.join(', ')}.`,
    }
  }

  return { isValid: true }
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
