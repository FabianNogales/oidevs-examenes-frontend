import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import { isAdminSubject } from './adminSubjectsApi'
import type {
  AdminSubject,
  SubjectFieldErrors,
  SubjectPayload,
  SubjectStatus,
} from '../types/adminSubject.types'

export class SubjectApiError extends Error {
  readonly status: number | null
  readonly fieldErrors: SubjectFieldErrors
  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: SubjectFieldErrors = {},
  ) {
    super(message)
    this.name = 'SubjectApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}
export function mapSubjectError(error: unknown): SubjectApiError {
  if (error instanceof SubjectApiError) return error
  const status = axios.isAxiosError(error)
    ? (error.response?.status ?? null)
    : null
  const fields: SubjectFieldErrors = {}
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors
    if (errors && typeof errors === 'object') {
      for (const [key, messages] of Object.entries(errors)) {
        const field = key.startsWith('career_ids.') ? 'career_ids' : key
        if (
          ['code', 'name', 'career_ids'].includes(field) &&
          Array.isArray(messages) &&
          typeof messages[0] === 'string'
        )
          fields[field as keyof SubjectPayload] = messages[0]
      }
    }
  }
  const message =
    status === 404
      ? 'La materia solicitada ya no existe.'
      : status === 403
        ? 'No tienes permisos para realizar esta operación.'
        : status === 422
          ? 'Revisa los campos indicados antes de continuar.'
          : status === 409
            ? 'Los datos entran en conflicto con otro registro. Actualiza la información.'
            : status === null
              ? 'No se pudo conectar con el servidor. Revisa tu conexión.'
              : 'El servidor no pudo completar la operación. Inténtalo nuevamente.'
  return new SubjectApiError(message, status, fields)
}
function readSubject(
  response: { data: AdminSubject },
  id?: number,
): AdminSubject {
  if (
    !isAdminSubject(response?.data) ||
    (id !== undefined && response.data.id !== id)
  )
    throw new SubjectApiError(
      'El servidor devolvió una respuesta de materia inválida. Actualiza el catálogo antes de continuar.',
    )
  return response.data
}
export async function getAdminSubject(
  id: number,
  signal: AbortSignal,
): Promise<AdminSubject> {
  try {
    return readSubject(
      (await httpClient.get(`/admin/subjects/${id}`, { signal })).data,
      id,
    )
  } catch (error) {
    throw mapSubjectError(error)
  }
}
export async function saveAdminSubject(
  payload: SubjectPayload,
  id?: number,
): Promise<AdminSubject> {
  try {
    const response =
      id === undefined
        ? await httpClient.post('/admin/subjects', payload)
        : await httpClient.put(`/admin/subjects/${id}`, payload)
    return readSubject(response.data, id)
  } catch (error) {
    throw mapSubjectError(error)
  }
}
export async function updateAdminSubjectStatus(
  id: number,
  status: SubjectStatus,
): Promise<AdminSubject> {
  try {
    const subject = readSubject(
      (await httpClient.patch(`/admin/subjects/${id}/status`, { status })).data,
      id,
    )
    if (subject.status !== status)
      throw new SubjectApiError(
        'El servidor no confirmó el cambio de estado. Actualiza el catálogo.',
      )
    return subject
  } catch (error) {
    throw mapSubjectError(error)
  }
}
