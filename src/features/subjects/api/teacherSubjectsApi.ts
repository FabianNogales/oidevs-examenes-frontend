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
  if (
    !Array.isArray(response.data?.data) ||
    !response.data.data.every(
      (item) =>
        item &&
        /^[1-9]\d*$/.test(String(item.course_offering_id)) &&
        Number.isSafeInteger(Number(item.course_offering_id)) &&
        typeof item.subject?.code === 'string' &&
        typeof item.subject?.name === 'string' &&
        typeof item.academic_term?.name === 'string' &&
        [item.status, item.subject.status, item.academic_term.status].every(
          (status) =>
            status === undefined ||
            status === 'ACTIVE' ||
            status === 'INACTIVE',
        ) &&
        (item.can_manage === undefined || typeof item.can_manage === 'boolean'),
    ) ||
    new Set(response.data.data.map((item) => String(item.course_offering_id)))
      .size !== response.data.data.length
  )
    throw new Error(
      'El servidor devolvió materias asignadas inválidas. Vuelve a consultar.',
    )
  return response.data.data.map(mapTeacherDashboardSubject)
}
