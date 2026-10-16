export type AcademicTermStatus = 'ACTIVE' | 'INACTIVE'

export interface AcademicTerm {
  id: number
  name: string
  start_date: string
  end_date: string
  status: AcademicTermStatus
}

export interface AcademicTermsQuery {
  page: number
  search: string
  status: AcademicTermStatus | ''
}

export interface AcademicTermsResponse {
  data: AcademicTerm[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

export interface AcademicTermPayload {
  name: string
  start_date: string
  end_date: string
}

export interface CreateAcademicTermPayload extends AcademicTermPayload {
  status: AcademicTermStatus
}

export type AcademicTermFieldErrors = Partial<
  Record<keyof CreateAcademicTermPayload, string>
>

export type AcademicTermSelection =
  { mode: 'create' } | { mode: 'detail' | 'edit'; termId: number }
