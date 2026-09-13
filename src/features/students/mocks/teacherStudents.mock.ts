import type { StudentEnrollment } from '@/features/students/types/student.types'
export { mockTeacherSubjects } from '@/features/subjects/mocks/teacherSubjects.mock'

export const mockStudentsBySubject: Record<string, StudentEnrollment[]> = {
  'subject-101': [
    { id: 'enr-1', sis: '202401234', fullName: 'Ana Quispe Mamani', status: 'Inscrito' },
    { id: 'enr-2', sis: '202401235', fullName: 'Carlos López Paredes', status: 'Inscrito' },
    { id: 'enr-3', sis: '202401236', fullName: 'Lucía Rojas Pacheco', status: 'Inscrito' },
  ],
  'subject-202': [
    { id: 'enr-4', sis: '202401237', fullName: 'Diego Flores Rojas', status: 'Inscrito' },
  ],
  'subject-303': [
    { id: 'enr-5', sis: '202401238', fullName: 'María Torres Sánchez', status: 'Inscrito' },
    { id: 'enr-6', sis: '202401239', fullName: 'José Condori Vaca', status: 'Inscrito' },
  ],
}

export function getMockSubjectStudents(subjectId: string): Promise<StudentEnrollment[]> {
  return Promise.resolve(mockStudentsBySubject[subjectId] ?? [])
}

export function getMockStudentBySis(sis: string): { sis: string; fullName: string } | null {
  const normalizedSis = sis.trim()

  if (!normalizedSis) {
    return null
  }

  const allStudents = Object.values(mockStudentsBySubject).flat()
  const student = allStudents.find((entry) => entry.sis === normalizedSis)

  if (student) {
    return {
      sis: student.sis,
      fullName: student.fullName,
    }
  }

  const pool = [
    '202401240', '202401241', '202401242', '202401243', '202401244', '202401245',
    '202401246', '202401247', '202401248', '202401249', '202401250',
  ]

  const available = pool.find((candidate) => candidate === normalizedSis)
  if (available) {
    return {
      sis: available,
      fullName: `Estudiante ${available}`,
    }
  }

  return null
}
