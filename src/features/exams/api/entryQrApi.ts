import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type {
  EntryHistoryQuery,
  EntryHistoryResponse,
  EntryQrPayload,
  EntryQrResponse,
} from '../types/entryQr.types'

const RESULTS = new Set([
  'AUTHORIZED',
  'INVALID_QR',
  'WRONG_EXAM',
  'DENIED',
  'ALREADY_REGISTERED',
])

function isScanResponse(value: unknown): value is EntryQrResponse {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return (
    typeof body.result === 'string' &&
    RESULTS.has(body.result) &&
    typeof body.message === 'string' &&
    typeof body.processed_at === 'string' &&
    (body.data === null ||
      (typeof body.data === 'object' && !Array.isArray(body.data)))
  )
}

export async function processEntryQr(
  examId: number,
  payload: EntryQrPayload,
  signal?: AbortSignal,
): Promise<EntryQrResponse> {
  try {
    const response = await httpClient.post<unknown>(
      `/exams/${examId}/entry-control/qr`,
      payload,
      { signal },
    )
    if (!isScanResponse(response.data)) throw new Error('Invalid scan response')
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
      // A validation error must never be displayed as a business scan result.
      if (
        !hasParameterErrors &&
        isScanResponse(body) &&
        ((status === 422 &&
          ['INVALID_QR', 'WRONG_EXAM', 'DENIED'].includes(body.result)) ||
          (status === 409 && body.result === 'ALREADY_REGISTERED'))
      )
        return body
    }
    // Keep the original HTTP error for the existing safe mapper/session interceptor.
    throw error
  }
}

export async function getEntryHistory(
  examId: number,
  query: EntryHistoryQuery,
  signal?: AbortSignal,
): Promise<EntryHistoryResponse> {
  const response = await httpClient.get<EntryHistoryResponse>(
    `/exams/${examId}/entry-control/entries`,
    { params: query, signal },
  )
  return response.data
}
