export type SubjectStatus = 'ACTIVE' | 'INACTIVE'
export type SubjectDialogSelection =
  { mode: 'create' } | { mode: 'detail' | 'edit'; subjectId: number }
export interface SubjectPayload {
  code: string
  name: string
  career_ids: number[]
}
export type SubjectFieldErrors = Partial<Record<keyof SubjectPayload, string>>
export interface SubjectCareer {
  id: number
  code: string
  name: string
  status: SubjectStatus
}
export interface AdminSubject {
  id: number
  code: string
  name: string
  status: SubjectStatus
  careers: SubjectCareer[]
}
export interface SubjectsQuery {
  page: number
  search: string
  status: SubjectStatus | ''
  career_id: string
}
export interface SubjectsResponse {
  data: AdminSubject[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}
