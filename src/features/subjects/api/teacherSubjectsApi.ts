import { env } from '@/app/config/env'
import { getMockTeacherSubjects } from '@/features/subjects/mocks/teacherSubjects.mock'
import type { Subject } from '@/features/subjects/types/subject.types'

const MOCK_DISABLED_MESSAGE =
  'No existe endpoint real para materias. Activa VITE_USE_STUDENTS_MOCK=true para revisar la experiencia de desarrollo.'

export async function getTeacherSubjects(): Promise<Subject[]> {
  if (!env.useStudentsMock) {
    throw new Error(MOCK_DISABLED_MESSAGE)
  }

  return getMockTeacherSubjects()
}