import type { Subject } from '@/features/subjects/types/subject.types'

export const mockTeacherSubjects: Subject[] = [
  {
    id: 'subject-101',
    code: 'MAT-101',
    name: 'Matemática I',
    academicManagement: '2/2026',
  },
  {
    id: 'subject-202',
    code: 'FIS-202',
    name: 'Física General',
    academicManagement: '1/2026',
  },
  {
    id: 'subject-303',
    code: 'PROG-303',
    name: 'Programación Avanzada',
    academicManagement: '2/2026',
  },
]

export function getMockTeacherSubjects(): Promise<Subject[]> {
  return Promise.resolve(mockTeacherSubjects)
}