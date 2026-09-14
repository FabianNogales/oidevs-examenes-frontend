import type { Subject } from '@/features/subjects/types/subject.types'

export interface StudentEnrollment {
  id: string | number
  sis: string
  fullName: string
  status: 'Inscrito'
}

export interface StudentEnrollmentDto {
  id: string | number
  sis_code: string
  first_names: string
  last_names: string
  status: string
}

export interface ManualEnrollmentDto {
  id: string | number
  sisCode: string
  firstNames: string
  lastNames: string
  status: string
}

export interface StudentCandidate {
  sis: string
  fullName: string
  courseOfferingId: string | number
}

export interface CsvRowIssue {
  row: number
  sis: string
  status?: string
  reason: string
}

export interface CsvImportSummary {
  validCount: number
  duplicateCount: number | null
  errorCount: number
  importedStudents: StudentEnrollment[]
  issues: CsvRowIssue[]
}

export type TeacherStudentSubject = Subject
