import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import { translateVisibleMessage } from '@/shared/api/visibleMessage'
import { isCourseOffering } from './courseOfferingsApi'
import type {
  CourseOffering,
  CourseOfferingStatus,
} from '../types/courseOffering.types'

export interface OfferingPayload {
  teacher_id: number
  subject_id: number
  academic_term_id: number
}
export class OfferingMutationError extends Error {
  readonly status: number | null
  readonly fields: Record<string, string>
  constructor(
    message: string,
    status: number | null = null,
    fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'OfferingMutationError'
    this.status = status
    this.fields = fields
  }
}
export function mapOfferingMutationError(
  error: unknown,
): OfferingMutationError {
  if (error instanceof OfferingMutationError) return error
  if (!axios.isAxiosError(error))
    return new OfferingMutationError(
      'No se pudo verificar la respuesta del servidor. Actualiza las asignaciones antes de reintentar.',
    )
  const status = error.response?.status ?? null
  const fields: Record<string, string> = {}
  const errors = error.response?.data?.errors
  if (errors && typeof errors === 'object') {
    for (const [field, messages] of Object.entries(errors)) {
      if (Array.isArray(messages) && typeof messages[0] === 'string')
        fields[field] = translateVisibleMessage(messages[0])
    }
  }
  const message =
    status === 403
      ? 'No tienes permisos para gestionar asignaciones.'
      : status === 404 || status === 501
        ? 'La operación solicitada aún no está disponible o el registro ya no existe.'
        : status === 409
          ? 'La asignación ya existe o cambió desde la última consulta. Actualiza los datos; no se duplicará ni eliminará su historial.'
          : status === 410
            ? 'La vista previa expiró. Vuelve a validar el archivo para este periodo.'
            : status === 413
              ? 'El archivo supera el tamaño máximo permitido de 10 MB.'
              : status === 422
                ? 'Revisa los datos indicados. El docente, la materia y el periodo deben estar habilitados.'
                : status === null
                  ? 'No se pudo confirmar la respuesta del servidor. Consulta las asignaciones antes de repetir la operación.'
                  : 'No se pudo completar la operación. Inténtalo nuevamente.'
  return new OfferingMutationError(message, status, fields)
}

function readOffering(value: unknown, id?: number): CourseOffering {
  if (!isCourseOffering(value) || (id !== undefined && value.id !== id))
    throw new OfferingMutationError(
      'El servidor devolvió una oferta inválida. Actualiza las asignaciones antes de continuar.',
    )
  return value
}
export async function getCourseOffering(id: number, signal: AbortSignal) {
  try {
    return readOffering(
      (await httpClient.get(`/admin/course-offerings/${id}`, { signal })).data
        ?.data,
      id,
    )
  } catch (error) {
    throw mapOfferingMutationError(error)
  }
}
export async function createCourseOfferings(payload: {
  teacher_id: number
  academic_term_id: number
  subject_ids: number[]
}) {
  try {
    const data: unknown = (
      await httpClient.post('/admin/course-offerings/bulk', payload)
    ).data?.data
    if (
      !Array.isArray(data) ||
      data.length !== payload.subject_ids.length ||
      !data.every(isCourseOffering) ||
      new Set(data.map((item) => item.id)).size !== data.length ||
      new Set(data.map((item) => item.subject.id)).size !== data.length ||
      data.some(
        (item) =>
          item.teacher.id !== payload.teacher_id ||
          item.academic_term.id !== payload.academic_term_id ||
          !payload.subject_ids.includes(item.subject.id) ||
          item.status !== 'ACTIVE',
      )
    )
      throw new OfferingMutationError(
        'No se pudieron verificar todas las asignaciones. Consulta el listado antes de volver a guardar.',
      )
    return data as CourseOffering[]
  } catch (error) {
    throw mapOfferingMutationError(error)
  }
}
export async function updateCourseOffering(
  id: number,
  payload: OfferingPayload,
) {
  try {
    const offering = readOffering(
      (await httpClient.put(`/admin/course-offerings/${id}`, payload)).data
        ?.data,
      id,
    )
    if (
      offering.teacher.id !== payload.teacher_id ||
      offering.subject.id !== payload.subject_id ||
      offering.academic_term.id !== payload.academic_term_id
    )
      throw new OfferingMutationError(
        'El servidor no confirmó los cambios solicitados. Actualiza el listado.',
      )
    return offering
  } catch (error) {
    throw mapOfferingMutationError(error)
  }
}
export async function updateCourseOfferingStatus(
  id: number,
  status: CourseOfferingStatus,
) {
  try {
    const offering = readOffering(
      (
        await httpClient.patch(`/admin/course-offerings/${id}/status`, {
          status,
        })
      ).data?.data,
      id,
    )
    if (offering.status !== status)
      throw new OfferingMutationError(
        'El servidor no confirmó el estado solicitado. Actualiza el listado.',
      )
    return offering
  } catch (error) {
    throw mapOfferingMutationError(error)
  }
}
