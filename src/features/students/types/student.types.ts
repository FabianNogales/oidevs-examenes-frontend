import type { Subject } from '@/features/subjects/types/subject.types'

export interface StudentEnrollment {
  id: string | number
  sis: string
  fullName: string
  status: 'Inscrito'
}

export interface StudentCandidate {
  sis: string
  fullName: string
  subjectId: string | number
}

export interface CsvRowIssue {
  row: number
  sis: string
  reason: string
}

export interface CsvImportSummary {
  validCount: number
  duplicateCount: number
  errorCount: number
  importedStudents: StudentEnrollment[]
  issues: CsvRowIssue[]
}

export type TeacherStudentSubject = Subject
