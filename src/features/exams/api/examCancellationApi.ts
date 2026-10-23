import { httpClient } from '@/shared/api/httpClient'
import { getRequestStatus } from '@/features/auth/utils/apiErrors'
import { isExamDetail, parseExamId, type ExamDetail } from './examDetailsApi'
import { ExamMutationError } from './examMutationsApi'

export async function cancelExam(
  original: ExamDetail,
  signal: AbortSignal,
): Promise<ExamDetail> {
  if (
    parseExamId(original.id) === null ||
    original.can_cancel !== true ||
    original.status === 'CANCELLED'
  ) {
    throw new ExamMutationError(
      'Este examen no está habilitado para cancelación.',
      403,
    )
  }
  try {
    const response = await httpClient.post<{ data: unknown }>(
      `/teacher/exams/${original.id}/cancel`,
      {
        expected_updated_at: original.updated_at,
      },
      { signal },
    )
    const result = response.data.data
    if (
      !isExamDetail(result, original.id) ||
      result.status !== 'CANCELLED' ||
      result.can_edit !== false ||
      result.can_cancel !== false ||
      result.course_offering_id !== original.course_offering_id ||
      result.room?.id !== original.room?.id ||
      result.subject_code !== original.subject_code ||
      result.academic_term_name !== original.academic_term_name ||
      result.name !== original.name ||
      result.exam_date !== original.exam_date ||
      result.start_time !== original.start_time ||
      result.duration_minutes !== original.duration_minutes ||
      result.evaluation_type !== original.evaluation_type ||
      result.rules !== original.rules
    ) {
      throw new ExamMutationError(
        'No se pudo verificar la cancelación. Recarga el examen para comprobar su estado antes de reintentar.',
        409,
      )
    }
    return result
  } catch (error) {
    if (error instanceof ExamMutationError) throw error
    const status = getRequestStatus(error)
    const messages: Record<number, string> = {
      401: 'Tu sesión ha caducado. Inicia sesión nuevamente.',
      403: 'Ya no tienes autorización para cancelar este examen.',
      404: 'El examen o la operación de cancelación no están disponibles.',
      409: 'El examen cambió o ya no permite cancelación. Recarga su información antes de continuar.',
      422: 'No se pudo cancelar el examen con su estado actual. Recarga su información.',
    }
    throw new ExamMutationError(
      messages[status ?? 0] ??
        'No se pudo confirmar la cancelación. Recarga el examen para verificar su estado antes de reintentar.',
      status,
      {},
      { cause: error },
    )
  }
}
