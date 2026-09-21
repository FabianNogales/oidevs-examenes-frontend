import type { StudentImportColumn } from '@/features/students/types/studentImport'

export const STUDENT_IMPORT_COLUMNS = [
  'sis_code',
  'identity_number',
  'first_names',
  'last_names',
  'email',
  'career',
  'profile_photo',
] as const satisfies readonly StudentImportColumn[]
