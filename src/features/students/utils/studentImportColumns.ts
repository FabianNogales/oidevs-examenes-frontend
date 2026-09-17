import type { StudentImportColumn } from '@/features/students/types/studentImport'

export const STUDENT_IMPORT_COLUMNS = [
  'SIS',
  'CI',
  'Nombres',
  'Apellidos',
  'Correo',
  'Carrera',
] as const satisfies readonly StudentImportColumn[]
