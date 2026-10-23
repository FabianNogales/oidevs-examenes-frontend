import { httpClient } from '@/shared/api/httpClient'
import { getAdminSubjects } from '@/features/subjects/api/adminSubjectsApi'

export interface OfferingChoice {
  id: number
  label: string
  detail: string
}
export interface ChoicePage {
  items: OfferingChoice[]
  lastPage: number
}
export async function getTeacherChoices(
  page: number,
  search: string,
  signal: AbortSignal,
): Promise<ChoicePage> {
  const result = (
    await httpClient.get('/admin/teachers', {
      signal,
      params: { page, search, per_page: 15 },
    })
  ).data
  if (
    !Array.isArray(result?.data) ||
    !Number.isSafeInteger(result?.meta?.last_page) ||
    result.meta.last_page < page
  )
    throw new Error('Invalid teacher catalog')
  const teachers = result.data as {
    id: number
    status: string
    first_names: string
    last_names: string
    email: string
    institutional_code: string
  }[]
  if (
    !teachers.every(
      (teacher) =>
        Number.isSafeInteger(teacher.id) &&
        teacher.id > 0 &&
        ['ACTIVE', 'INACTIVE'].includes(teacher.status) &&
        ['first_names', 'last_names', 'email', 'institutional_code'].every(
          (field) => typeof teacher[field as keyof typeof teacher] === 'string',
        ),
    )
  )
    throw new Error('Invalid teacher catalog')
  return {
    items: teachers
      .filter((teacher) => teacher.status === 'ACTIVE')
      .map((teacher) => ({
        id: teacher.id,
        label: `${teacher.first_names} ${teacher.last_names}`,
        detail: `${teacher.institutional_code} · ${teacher.email}`,
      })),
    lastPage: result.meta.last_page,
  }
}
export async function getSubjectChoices(
  page: number,
  search: string,
  signal: AbortSignal,
): Promise<ChoicePage> {
  const result = await getAdminSubjects(
    { page, search, status: 'ACTIVE', career_id: '' },
    signal,
  )
  return {
    items: result.data
      .filter((subject) => subject.status === 'ACTIVE')
      .map((subject) => ({
        id: subject.id,
        label: `${subject.code} · ${subject.name}`,
        detail:
          subject.careers.map((career) => career.name).join(', ') ||
          'Sin carreras asociadas',
      })),
    lastPage: result.meta.last_page,
  }
}
