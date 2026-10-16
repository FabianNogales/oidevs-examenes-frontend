import {
  getApiFieldErrors,
  getApiErrorMessage,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'
import { httpClient } from '@/shared/api/httpClient'
import type {
  BulkEligibilityResponse,
  BulkEligibilityResult,
  EligibilitiesResponse,
  EligibilityReason,
  EligibilityReasonsResponse,
  ExamEligibility,
  UpdateEligibilityPayload,
} from '../types/eligibility.types'
import { getSafeEligibilityMessage } from '../utils/eligibilityErrors'

export class EligibilityApiError extends Error {
  status: number | null
  fieldErrors: Record<string, string>

  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'EligibilityApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function mapEligibilityError(
  error: unknown,
  fallback: string,
): EligibilityApiError {
  const status = getRequestStatus(error)
  if (status === 403) {
    return new EligibilityApiError(
      'No tienes autorización para gestionar las habilitaciones de este examen.',
      status,
    )
  }
  if (status === 422) {
    const fieldErrors = Object.fromEntries(
      Object.entries(getApiFieldErrors(error)).map(([field, message]) => [
        field,
        getSafeEligibilityMessage(message, 'Revisa el valor ingresado.'),
      ]),
    )
    return new EligibilityApiError(
      getSafeEligibilityMessage(
        fieldErrors.file ?? getApiErrorMessage(error),
        'Revisa los datos enviados y vuelve a intentarlo.',
      ),
      status,
      fieldErrors,
    )
  }
  if (status === 404) {
    return new EligibilityApiError(
      'Este recurso de habilitaciones no está disponible.',
      status,
    )
  }
  if (status === 401) {
    return new EligibilityApiError(
      'Tu sesión ha caducado. Inicia sesión nuevamente.',
      status,
    )
  }
  return new EligibilityApiError(fallback, status)
}

export async function getExamEligibilities(
  examId: number,
  signal?: AbortSignal,
): Promise<ExamEligibility[]> {
  try {
    // Load the full documented list. Search and status filters are local so counts
    // always describe all students in the exam, not a filtered server response.
    const response = await httpClient.get<EligibilitiesResponse>(
      `/exams/${examId}/eligibilities`,
      { signal },
    )
    if (!Array.isArray(response.data.data))
      throw new Error('Invalid eligibilities response')
    return response.data.data.map((item) => ({
      ...item,
      reason_code: item.reason_code ?? null,
      reason: item.reason ?? null,
      observations: item.observations ?? null,
    }))
  } catch (error) {
    throw mapEligibilityError(
      error,
      'No se pudieron cargar las habilitaciones. Inténtalo nuevamente.',
    )
  }
}

export async function getEligibilityReasons(
  examId: number,
  signal?: AbortSignal,
): Promise<EligibilityReason[]> {
  try {
    const response = await httpClient.get<EligibilityReasonsResponse>(
      `/exams/${examId}/eligibilities/reasons`,
      { signal },
    )
    const reasons = response.data.data
    if (
      !Array.isArray(reasons) ||
      reasons.some(
        (item) =>
          !item ||
          typeof item.code !== 'string' ||
          !item.code.trim() ||
          typeof item.label !== 'string' ||
          !item.label.trim(),
      )
    ) {
      throw new Error('Invalid eligibility reasons response')
    }
    return reasons
  } catch (error) {
    throw mapEligibilityError(
      error,
      'No se pudieron cargar los motivos. Inténtalo nuevamente.',
    )
  }
}

export async function bulkUpdateExamEligibilities(
  examId: number,
  file: File,
  signal?: AbortSignal,
): Promise<BulkEligibilityResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    // The browser supplies multipart/form-data with its boundary.
    const response = await httpClient.post<BulkEligibilityResponse>(
      `/exams/${examId}/eligibilities/bulk`,
      formData,
      { signal },
    )
    const result = response.data.data
    if (
      !result ||
      !Array.isArray(result.errors) ||
      ![result.total_rows, result.updated_rows, result.failed_rows].every(
        (count) => Number.isSafeInteger(count) && count >= 0,
      ) ||
      result.errors.some(
        (issue) =>
          !issue ||
          !Number.isSafeInteger(issue.row) ||
          issue.row < 1 ||
          typeof issue.sis_code !== 'string' ||
          !issue.messages ||
          typeof issue.messages !== 'object' ||
          Array.isArray(issue.messages) ||
          Object.values(issue.messages).some(
            (messages) => !Array.isArray(messages) ||
              messages.some((message) => typeof message !== 'string'),
          ),
      )
    ) {
      throw new Error('Invalid bulk eligibilities response')
    }
    return result
  } catch (error) {
    throw mapEligibilityError(
      error,
      'No se pudo procesar el archivo. Inténtalo nuevamente.',
    )
  }
}

export async function updateExamEligibility(
  examId: number,
  studentId: number,
  payload: UpdateEligibilityPayload,
  signal?: AbortSignal,
): Promise<void> {
  try {
    // PATCH identifies the student, not the eligibility record's id.
    // Its response body was not specified; refresh the documented GET after success.
    await httpClient.patch(
      `/exams/${examId}/eligibilities/${studentId}`,
      payload,
      { signal },
    )
  } catch (error) {
    throw mapEligibilityError(
      error,
      'No se pudo guardar la habilitación. Inténtalo nuevamente.',
    )
  }
}
