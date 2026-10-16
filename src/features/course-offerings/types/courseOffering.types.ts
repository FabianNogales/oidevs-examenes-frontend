import type { Teacher } from '@/features/admin/types/teacher.types'
import type { AcademicTerm } from '@/features/academic-terms/types/academicTerm.types'
import type { AdminSubject } from '@/features/subjects/types/adminSubject.types'

export type CourseOfferingStatus = 'ACTIVE' | 'INACTIVE'

export interface CourseOffering {
  id: number
  teacher: Omit<Teacher, 'identity_number'>
  subject: AdminSubject
  academic_term: AcademicTerm
  status: CourseOfferingStatus
  enrollments_count: number
  exams_count: number
}

export interface CourseOfferingsQuery {
  page: number
  search: string
  status: CourseOfferingStatus | ''
  academic_term_id: string
  teacher_id?: number
}

export interface CourseOfferingsResponse {
  data: CourseOffering[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}
