export type StudentStatus = 'ACTIVE' | 'INACTIVE'
export type StudentCareer = string | { id: string | number; name: string } | null
export interface Student {
  id: string
  institutional_code: string
  first_names: string
  last_names: string
  email: string
  career: StudentCareer
  status: StudentStatus
}

export interface StudentDetail extends Student {
  identity_number: string
  career_id?: string | number | null
}

export interface GetStudentsParams {
  page?: number
  perPage?: number
  search?: string
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  total: number
}

export interface StudentsPageResult {
  students: Student[]
  meta: PaginationMeta
}

export interface StudentsResponse {
  data: Student[]
  meta: PaginationMeta
}

export interface StudentResponse {
  data: Student
}

export interface StudentDetailResponse {
  data: StudentDetail
}

export type StudentField =
  | 'institutional_code'
  | 'identity_number'
  | 'first_names'
  | 'last_names'
  | 'email'
  | 'career_id'

export type StudentFieldErrors = Partial<Record<StudentField, string[]>>

/** Payload para registrar (POST /admin/students). */
export interface CreateStudentPayload {
  institutional_code: string
  identity_number: string
  first_names: string
  last_names: string
  email: string
  career_id: string | number
}

/** Payload para edición parcial (PATCH /admin/students/{id}). */
export type UpdateStudentPayload = Partial<CreateStudentPayload>

/** Resultado de la importación CSV (StudentCsvImportService). */
export interface StudentImportResult {
  total_rows: number
  valid_rows: number
  error_rows: number
  imported_rows?: number
  skipped_rows?: number
  failed_rows?: number
  audit_status?: 'RECORDED' | 'FAILED'
  warnings?: string[]
  [key: string]: unknown
}

export interface StudentImportResponse {
  success: boolean
  message: string
  data: StudentImportResult
}
