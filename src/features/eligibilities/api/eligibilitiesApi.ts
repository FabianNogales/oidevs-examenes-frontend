import {
  getApiFieldErrors,
  getApiErrorMessage,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'
import { httpClient } from '@/shared/api/httpClient'
import type {
  BulkEligibilityResult,
  EligibilitiesResponse,
  EligibilityReason,
  EligibilityReasonsResponse,
  ExamEligibility,
  UpdateEligibilityPayload,
} from '../types/eligibility.types'
import { getSafeEligibilityMessage } from '../utils/eligibilityErrors'

export const ELIGIBILITY_CONFLICT_MESSAGE =
  'Esta habilitación fue modificada mientras la estabas editando. Actualiza los datos antes de guardar nuevamente.'

export class EligibilityApiError extends Error {
  status: number | null
  fieldErrors: Record<string, string>
  outcomeUnknown: boolean

  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: Record<string, string> = {},
    outcomeUnknown = false,
  ) {
    super(message)
    this.name = 'EligibilityApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.outcomeUnknown = outcomeUnknown
  }
}

function mapEligibilityError(
  error: unknown,
  fallback: string,
): EligibilityApiError {
  const status = getRequestStatus(error)
  if (status === 409) {
    return new EligibilityApiError(ELIGIBILITY_CONFLICT_MESSAGE, status)
  }
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
    return response.data.data.map((item) => {
      if (!Number.isSafeInteger(item.revision) || item.revision < 1) {
        throw new Error('Invalid eligibility revision')
      }
      return {
        ...item,
        reason_code: item.reason_code ?? null,
        reason: item.reason ?? null,
        observations: item.observations ?? null,
      }
    })
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

const UNKNOWN_BULK_OUTCOME =
  'No se pudo confirmar el resultado de la carga. Revisa las habilitaciones antes de volver a procesar el archivo.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isBulkEligibilityResult(value: unknown): value is BulkEligibilityResult {
  if (!isRecord(value)) return false
  const { total_rows: total, updated_rows: updated, failed_rows: failed, errors } = value
  if (
    ![total, updated, failed].every((count) => Number.isSafeInteger(count) && (count as number) >= 0) ||
    !Array.isArray(errors) ||
    total !== (updated as number) + (failed as number) ||
    failed !== errors.length
  ) return false

  return errors.every((issue: unknown) =>
    isRecord(issue) &&
    Number.isSafeInteger(issue.row) && (issue.row as number) >= 1 &&
    (typeof issue.sis_code === 'string' || issue.sis_code === null) &&
    isRecord(issue.messages) &&
    Object.values(issue.messages).every((messages: unknown) =>
      Array.isArray(messages) && messages.every((message: unknown) => typeof message === 'string'),
    ),
  )
}

export function getBulkEligibilityNotice(result: BulkEligibilityResult): {
  type: 'success' | 'info'
  title: string
  message: string
} {
  if (result.updated_rows > 0 && result.failed_rows === 0) {
    return {
      type: 'success', title: 'Carga completada',
      message: `Carga completada: ${result.updated_rows} ${result.updated_rows === 1 ? 'fila procesada' : 'filas procesadas'} correctamente.`,
    }
  }
  if (result.updated_rows > 0) {
    return {
      type: 'info', title: 'Carga parcial',
      message: `Carga parcial: ${result.updated_rows} ${result.updated_rows === 1 ? 'fila actualizada' : 'filas actualizadas'} y ${result.failed_rows} ${result.failed_rows === 1 ? 'rechazada' : 'rechazadas'}.`,
    }
  }
  return {
    type: 'info', title: 'Sin cambios aplicados',
    message: result.failed_rows > 0
      ? 'No se aplicaron cambios. Revisa los errores por fila.'
      : 'No se aplicaron cambios. No se procesaron registros.',
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
    const response = await httpClient.post<unknown>(
      `/exams/${examId}/eligibilities/bulk`,
      formData,
      { signal },
    )
    if (!isRecord(response.data) || typeof response.data.message !== 'string' ||
      !isBulkEligibilityResult(response.data.data)) {
      throw new EligibilityApiError(UNKNOWN_BULK_OUTCOME, response.status, {}, true)
    }
    return response.data.data
  } catch (error) {
    if (error instanceof EligibilityApiError) throw error
    const mapped = mapEligibilityError(error, 'No se pudo procesar el archivo. Revisa la solicitud antes de continuar.')
    if ([400, 401, 403, 404, 413, 415, 419, 422, 429].includes(mapped.status ?? 0)) throw mapped
    // A missing/invalid response or a server failure does not prove rollback.
    throw new EligibilityApiError(UNKNOWN_BULK_OUTCOME, mapped.status, {}, true)
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
