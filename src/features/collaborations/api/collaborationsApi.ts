import {
  getApiFieldErrors,
  getApiErrorMessage,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'
import { httpClient } from '@/shared/api/httpClient'
import type {
  CollaborationUser,
  ExamCollaborator,
  ExamCollaboratorsResponse,
  MyCollaboration,
} from '../types/collaboration.types'

export function getCollaborationError(
  error: unknown,
  fallback: string,
): string {
  const status = getRequestStatus(error)
  if (status === 401)
    return 'Tu sesión ha caducado. Inicia sesión nuevamente.'

  // Show business errors, but keep server failures and internal diagnostics out of UI.
  const fieldErrors: Record<string, string> =
    status === 422 ? getApiFieldErrors(error) : {}
  const messages = [
    fieldErrors.user_id,
    fieldErrors.exam_id,
    getApiErrorMessage(error),
  ]
  if (status !== null && [400, 403, 404, 409, 422].includes(status)) {
    for (const candidate of messages) {
      const message = candidate?.trim()
      if (
        message &&
        message.length <= 300 &&
        !/SQLSTATE|\bSQL\b|exception|stack\s*trace|traceback|\b(?:select|insert|update|delete)\s+.+\b(?:from|into|set)\b|\.php\b|[A-Z]:\\|\/var\/|\/vendor\/|[<>\r\n]/i.test(message)
      ) {
        return message
      }
    }
  }
  if (status === 403)
    return 'No tienes autorización para realizar esta operación.'
  if (status === 404)
    return 'La autorización o el examen ya no está disponible.'
  if (status === 422)
    return 'Los datos enviados no son válidos para esta operación.'
  if (status === 409)
    return 'El usuario ya tiene una autorización para este examen.'
  return fallback
}

export async function getMyCollaborations(
  signal?: AbortSignal,
): Promise<MyCollaboration[]> {
  const response = await httpClient.get<{ data: MyCollaboration[] }>(
    '/me/collaborations',
    { signal },
  )
  if (!Array.isArray(response.data.data))
    throw new Error('La respuesta de colaboraciones no tiene el formato esperado.')
  return response.data.data
}

export async function searchCollaborationUsers(
  query: string,
  examId: number,
  signal?: AbortSignal,
): Promise<CollaborationUser[]> {
  const response = await httpClient.get<{ data: CollaborationUser[] }>('/users', {
    params: { search: query.trim(), exam_id: examId },
    signal,
  })
  if (!Array.isArray(response.data.data))
    throw new Error('La respuesta de usuarios no tiene el formato esperado.')
  return response.data.data
}

export async function getExamCollaborators(
  examId: number,
  signal?: AbortSignal,
): Promise<ExamCollaborator[]> {
  const response = await httpClient.get<ExamCollaboratorsResponse>(
    `/exams/${examId}/collaborators`,
    { signal },
  )
  if (!Array.isArray(response.data.data))
    throw new Error('La respuesta de colaboradores no tiene el formato esperado.')
  return response.data.data.map((collaborator) => ({
    ...collaborator,
    profile_photo_url: collaborator.profile_photo_url ?? null,
  }))
}

export async function assignExamCollaborator(
  examId: number,
  userId: number,
): Promise<void> {
  await httpClient.post(`/exams/${examId}/collaborators`, {
    user_id: userId,
  })
}

export async function revokeExamCollaborator(
  examId: number,
  userId: number,
): Promise<void> {
  await httpClient.delete(`/exams/${examId}/collaborators/${userId}`)
}
