import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type {
  AdminSubject,
  SubjectCareer,
  SubjectsQuery,
  SubjectsResponse,
} from '../types/adminSubject.types'

export function isSubjectCareer(value: unknown): value is SubjectCareer {
  if (!value || typeof value !== 'object') return false
  const career = value as SubjectCareer
  return (
    Number.isSafeInteger(career.id) &&
    career.id > 0 &&
    typeof career.code === 'string' &&
    typeof career.name === 'string' &&
    ['ACTIVE', 'INACTIVE'].includes(career.status)
  )
}

export function isAdminSubject(value: unknown): value is AdminSubject {
  if (!value || typeof value !== 'object') return false
  const subject = value as AdminSubject
  return (
    Number.isSafeInteger(subject.id) &&
    subject.id > 0 &&
    typeof subject.code === 'string' &&
    typeof subject.name === 'string' &&
    ['ACTIVE', 'INACTIVE'].includes(subject.status) &&
    Array.isArray(subject.careers) &&
    subject.careers.every(isSubjectCareer)
  )
}

export async function getAdminSubjects(
  query: SubjectsQuery,
  signal: AbortSignal,
): Promise<SubjectsResponse> {
  const response = await httpClient.get<SubjectsResponse>('/admin/subjects', {
    signal,
    params: {
      ...query,
      per_page: 15,
      search: query.search || undefined,
      status: query.status || undefined,
      career_id: query.career_id || undefined,
    },
  })
  const result = response.data
  const meta = result?.meta
  if (
    !Array.isArray(result?.data) ||
    !result.data.every(isAdminSubject) ||
    !meta ||
    !Number.isSafeInteger(meta.current_page) ||
    meta.current_page < 1 ||
    !Number.isSafeInteger(meta.last_page) ||
    meta.last_page < meta.current_page ||
    !Number.isSafeInteger(meta.total) ||
    meta.total < 0 ||
    !Number.isSafeInteger(meta.per_page) ||
    meta.per_page < 1
  ) {
    throw new Error('Invalid subject catalog response')
  }
  return result
}

export async function getSubjectCareers(
  signal: AbortSignal,
): Promise<SubjectCareer[]> {
  const response = await httpClient.get<{ data: SubjectCareer[] }>(
    '/admin/subjects/careers',
    { signal },
  )
  if (
    !Array.isArray(response.data?.data) ||
    !response.data.data.every(isSubjectCareer)
  )
    throw new Error('Invalid careers response')
  return response.data.data
}

export function getSubjectsErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403)
      return 'No tienes permisos para consultar las materias.'
    if ([404, 501].includes(error.response?.status ?? 0))
      return 'El catálogo de materias aún no está disponible en el servidor.'
    if (!error.response)
      return 'No se pudo conectar con el servidor. Revisa tu conexión.'
  }
  return 'No se pudieron cargar los datos de materias. Inténtalo nuevamente.'
}
