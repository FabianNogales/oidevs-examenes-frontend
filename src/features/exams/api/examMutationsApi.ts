import { httpClient } from '@/shared/api/httpClient'
import {
  getApiFieldErrors,
  getApiErrorCode,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'
import { isExamDetail, parseExamId, type ExamDetail } from './examDetailsApi'
import type { CreateExamPayload } from '../types/exam.types'
import { safeExamMessage } from '../utils/examMessages'

export class ExamMutationError extends Error {
  readonly status: number | null
  readonly fields: Record<string, string>
  constructor(
    message: string,
    status: number | null,
    fields: Record<string, string> = {},
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ExamMutationError'
    this.status = status
    this.fields = fields
  }
}

export async function updateExam(
  original: ExamDetail,
  values: CreateExamPayload,
  signal: AbortSignal,
): Promise<ExamDetail> {
  if (parseExamId(original.id) === null || original.can_edit !== true) {
    throw new ExamMutationError(
      'Este examen no está habilitado para edición.',
      403,
    )
  }
  try {
    // Keep subject, offering, period and status out of the writable payload.
    const response = await httpClient.patch<{ data: unknown }>(
      `/teacher/exams/${original.id}`,
      {
        name: values.name,
        exam_date: values.exam_date,
        start_time: values.start_time,
        duration_minutes: values.duration_minutes,
        room_id: values.room_id,
        evaluation_type: values.evaluation_type,
        rules: values.rules ?? null,
        expected_updated_at: original.updated_at,
      },
      { signal },
    )
    const result = response.data.data
    if (
      !isExamDetail(result, original.id) ||
      result.course_offering_id !== original.course_offering_id ||
      result.name !== values.name ||
      result.exam_date !== values.exam_date ||
      result.start_time.slice(0, 5) !== values.start_time.slice(0, 5) ||
      result.duration_minutes !== values.duration_minutes ||
      result.room?.id !== values.room_id ||
      result.evaluation_type !== values.evaluation_type ||
      result.rules !== (values.rules ?? null)
    ) {
      throw new ExamMutationError(
        'No se pudo verificar el resultado. Recarga el examen para comprobar sus datos antes de volver a guardar.',
        409,
      )
    }
    return result
  } catch (error) {
    if (error instanceof ExamMutationError) throw error
    const status = getRequestStatus(error)
    if (getApiErrorCode(error) === 'EXAM_VERSION_PRECISION_REQUIRED') {
      throw new ExamMutationError(
        'La edición no está disponible temporalmente. Contacta a administración para habilitarla antes de reintentar.',
        status,
        {},
        { cause: error },
      )
    }
    const messages: Record<number, string> = {
      401: 'Tu sesión ha caducado. Inicia sesión nuevamente.',
      403: 'Ya no tienes autorización para editar este examen.',
      404: 'El examen ya no está disponible.',
      409: 'El examen o su disponibilidad cambiaron. Recarga la información antes de volver a guardar.',
      422: 'Revisa los campos indicados. No se guardaron los cambios.',
    }
    const fields =
      status === 422
        ? Object.fromEntries(
            Object.entries(getApiFieldErrors(error)).map(([field, message]) => [
              field,
              safeExamMessage(message, 'Revisa el valor ingresado.'),
            ]),
          )
        : {}
    throw new ExamMutationError(
      messages[status ?? 0] ??
        'No se pudo confirmar el guardado. Recarga el examen para verificar su estado antes de reintentar.',
      status,
      fields,
      { cause: error },
    )
  }
}
