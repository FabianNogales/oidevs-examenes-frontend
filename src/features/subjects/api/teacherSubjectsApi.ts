import { env } from '@/app/config/env'
import { getMockTeacherSubjects } from '@/features/subjects/mocks/teacherSubjects.mock'
import { httpClient } from '@/shared/api/httpClient'
import {
  mapTeacherDashboardSubject,
  type Subject,
  type TeacherDashboardSubjectsResponse,
} from '@/features/subjects/types/subject.types'

export async function getTeacherSubjects(): Promise<Subject[]> {
  if (env.useStudentsMock) {
    return getMockTeacherSubjects()
  }

  const response = await httpClient.get<TeacherDashboardSubjectsResponse>(
    '/teacher/dashboard/subjects',
  )

  return response.data.data.map(mapTeacherDashboardSubject)
}