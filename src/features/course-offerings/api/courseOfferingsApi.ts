import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import { isAcademicTerm } from '@/features/academic-terms/api/academicTermsApi'
import { isAdminSubject } from '@/features/subjects/api/adminSubjectsApi'
import type {
  CourseOffering,
  CourseOfferingsQuery,
  CourseOfferingsResponse,
} from '../types/courseOffering.types'

export class CourseOfferingApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CourseOfferingApiError'
  }
}

const positiveId = (value: number) => Number.isSafeInteger(value) && value > 0
const count = (value: number) => Number.isSafeInteger(value) && value >= 0

export function isCourseOffering(value: unknown): value is CourseOffering {
  if (!value || typeof value !== 'object') return false
  const offering = value as CourseOffering
  const teacher = offering.teacher
  return (
    positiveId(offering.id) &&
    Boolean(teacher) &&
    positiveId(teacher.id) &&
    ['institutional_code', 'first_names', 'last_names', 'email'].every(
      (field) => typeof teacher[field as keyof typeof teacher] === 'string',
    ) &&
    ['ACTIVE', 'INACTIVE'].includes(teacher.status) &&
    isAdminSubject(offering.subject) &&
    isAcademicTerm(offering.academic_term) &&
    ['ACTIVE', 'INACTIVE'].includes(offering.status) &&
    count(offering.enrollments_count) &&
    count(offering.exams_count)
  )
}

export function getCourseOfferingError(error: unknown): string {
  if (error instanceof CourseOfferingApiError) return error.message
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (!error.response)
      return 'No se pudo conectar con el servidor. Revisa tu conexión.'
    if (status === 403)
      return 'No tienes permisos para consultar las asignaciones de materias.'
    if (status === 404 || status === 501)
      return 'La gestión de asignaciones aún no está disponible en el servidor.'
  }
  return 'No se pudieron cargar las asignaciones. Inténtalo nuevamente.'
}

export async function getCourseOfferings(
  query: CourseOfferingsQuery,
  signal: AbortSignal,
): Promise<CourseOfferingsResponse> {
  const response = await httpClient.get<CourseOfferingsResponse>(
    '/admin/course-offerings',
    {
      signal,
      params: {
        ...query,
        per_page: 15,
        search: query.search.trim() || undefined,
        status: query.status || undefined,
        academic_term_id: query.academic_term_id || undefined,
      },
    },
  )
  const result = response.data
  const meta = result?.meta
  if (
    !Array.isArray(result?.data) ||
    !result.data.every(isCourseOffering) ||
    !meta ||
    !positiveId(meta.current_page) ||
    meta.current_page !== query.page ||
    !positiveId(meta.last_page) ||
    meta.last_page < meta.current_page ||
    !positiveId(meta.per_page) ||
    meta.per_page > 100 ||
    !count(meta.total) ||
    meta.last_page !== Math.max(1, Math.ceil(meta.total / meta.per_page)) ||
    result.data.length !==
      Math.min(
        meta.per_page,
        Math.max(0, meta.total - (meta.current_page - 1) * meta.per_page),
      ) ||
    (meta.total === 0
      ? meta.from !== null || meta.to !== null
      : meta.from !== (meta.current_page - 1) * meta.per_page + 1 ||
        meta.to !== meta.from + result.data.length - 1) ||
    new Set(result.data.map((offering) => offering.id)).size !==
      result.data.length ||
    result.data.some(
      (offering) =>
        (query.teacher_id !== undefined &&
          offering.teacher.id !== query.teacher_id) ||
        (Boolean(query.academic_term_id) &&
          String(offering.academic_term.id) !== query.academic_term_id) ||
        (Boolean(query.status) && offering.status !== query.status),
    )
  ) {
    throw new CourseOfferingApiError(
      'El servidor devolvió asignaciones inválidas o ajenas a los filtros seleccionados. Vuelve a intentarlo.',
    )
  }
  return result
}
