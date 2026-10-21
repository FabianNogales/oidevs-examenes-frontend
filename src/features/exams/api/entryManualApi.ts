import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type {
  EntryManualPayload,
  EntryManualResponse,
} from '../types/entryRegistration.types'

function isManualResponse(value: unknown): value is EntryManualResponse {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return (
    typeof body.result === 'string' &&
    ['AUTHORIZED', 'ALREADY_REGISTERED', 'DENIED'].includes(body.result) &&
    typeof body.message === 'string' &&
    typeof body.processed_at === 'string' &&
    (body.data === null ||
      (typeof body.data === 'object' && !Array.isArray(body.data)))
  )
}

export async function registerEntryManually(
  examId: number,
  studentId: number,
  payload: EntryManualPayload,
  signal?: AbortSignal,
): Promise<EntryManualResponse> {
  try {
    const response = await httpClient.post<unknown>(
      `/exams/${examId}/entry-control/students/${studentId}/entries`,
      { room_id: payload.room_id },
      { signal },
    )
    if (
      response.status !== 201 ||
      !isManualResponse(response.data) ||
      response.data.result !== 'AUTHORIZED'
    )
      throw new Error('Invalid manual entry response')
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body: unknown = error.response?.data
      const status = error.response?.status
      const hasParameterErrors =
        body &&
        typeof body === 'object' &&
        'errors' in body &&
        body.errors != null
      if (
        !hasParameterErrors &&
        isManualResponse(body) &&
        ((status === 409 && body.result === 'ALREADY_REGISTERED') ||
          (status === 422 && body.result === 'DENIED'))
      )
        return body
    }
    // Preserve HTTP errors and the global 401 session interceptor.
    throw error
  }
}
