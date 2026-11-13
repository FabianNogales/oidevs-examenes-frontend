export type TeacherStatus = 'ACTIVE' | 'INACTIVE'

export interface Teacher {
  id: number
  institutional_code: string
  identity_number: string
  first_names: string
  last_names: string
  email: string
  status: TeacherStatus
}

export interface TeacherFormValues {
  institutional_code: string
  identity_number: string
  first_names: string
  last_names: string
  email: string
}

export interface TeachersPaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  path: string
  per_page: number
  to: number | null
  total: number
}

export interface TeachersResponse {
  data: Teacher[]
  meta: TeachersPaginationMeta
}

export interface TeacherResponse {
  data: Teacher
}

export type TeacherField =
  | 'institutional_code'
  | 'identity_number'
  | 'first_names'
  | 'last_names'
  | 'email'

export type TeacherFieldErrors = Partial<
  Record<TeacherField, string[]>
>

export interface GetTeachersParams {
  page?: number
  perPage?: number
  search?: string
}

export interface TeachersPageResult {
  teachers: Teacher[]
  meta: TeachersPaginationMeta
}