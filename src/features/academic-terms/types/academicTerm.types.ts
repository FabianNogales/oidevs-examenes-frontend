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
