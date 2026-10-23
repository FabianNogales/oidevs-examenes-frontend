export type StudentImportColumn =
  | 'sis_code'
  | 'identity_number'
  | 'first_names'
  | 'last_names'
  | 'email'
  | 'career'
  | 'profile_photo'

export type CsvValidationResult = {
  isValid: boolean
  message?: string
}

export type StudentImportRowData = Record<StudentImportColumn, string>

export type StudentImportPreviewRow = {
  row: number
  data: StudentImportRowData
  valid: boolean
  errors: string[]
}

export type StudentImportPreview = {
  valid: boolean
  total_rows: number
  valid_rows: number
  error_rows: number
  errors: string[]
  rows: StudentImportPreviewRow[]
}

export type StudentImportResult = {
  row: number
  sis_code: string
  status: 'IMPORTED' | 'SKIPPED' | 'FAILED'
  errors: string[]
  student_id: number | null
}

export type StudentImportConfirmation = StudentImportPreview & {
  imported_rows: number
  skipped_rows: number
  failed_rows: number
  results: StudentImportResult[]
  audit_status: 'RECORDED' | 'FAILED'
  warnings: string[]
}

export type StudentImportPreviewResponse = {
  success: boolean
  message: string
  data: StudentImportPreview
}

export type StudentImportConfirmationResponse = {
  success: boolean
  message: string
  data: StudentImportConfirmation
}
