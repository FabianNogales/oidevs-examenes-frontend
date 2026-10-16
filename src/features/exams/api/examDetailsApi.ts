import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type { ManagedExam } from './examManagementApi'

export type ExamDetail = ManagedExam & {
  course_offering_id: number
  rules: string | null
  status: string
  start_time: string
  duration_minutes: number
  updated_at: string
  can_edit?: boolean
  edit_block_reason?: string | null
}

export type ExamDetailResult = {
  exam: ManagedExam
  detail: ExamDetail | null
}

export function parseExamId(value: string | number | undefined): number | null {
  if (!/^[1-9]\d*$/.test(String(value))) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

export function isExamDetail(value: unknown, id: number): value is ExamDetail {
  if (typeof value !== 'object' || value === null) return false
  const exam = value as Record<string, unknown>
  const room = exam.room
  return (
    exam.id === id &&
    typeof exam.name === 'string' &&
    exam.name.trim().length > 0 &&
    typeof exam.subject_code === 'string' &&
    typeof exam.subject_name === 'string' &&
    typeof exam.exam_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(exam.exam_date) &&
    typeof exam.start_time === 'string' &&
    /^\d{2}:\d{2}(:\d{2})?$/.test(exam.start_time) &&
    typeof exam.duration_minutes === 'number' &&
    Number.isInteger(exam.duration_minutes) &&
    exam.duration_minutes > 0 &&
    typeof exam.status === 'string' &&
    exam.status.length > 0 &&
    typeof exam.course_offering_id === 'number' &&
    Number.isSafeInteger(exam.course_offering_id) &&
    exam.course_offering_id > 0 &&
    (exam.rules === null || typeof exam.rules === 'string') &&
    typeof exam.updated_at === 'string' &&
    Number.isFinite(Date.parse(exam.updated_at)) &&
    (exam.can_edit === undefined || typeof exam.can_edit === 'boolean') &&
    (exam.edit_block_reason == null ||
      typeof exam.edit_block_reason === 'string') &&
    (exam.academic_term_name == null ||
      typeof exam.academic_term_name === 'string') &&
    (exam.evaluation_type == null ||
      ['partial', 'final', 'makeup'].includes(String(exam.evaluation_type))) &&
    (room == null ||
      (typeof room === 'object' &&
        'id' in room &&
        Number.isSafeInteger(room.id) &&
        'code' in room &&
        typeof room.code === 'string' &&
        'name' in room &&
        typeof room.name === 'string'))
  )
}

export async function getExamDetail(
  id: number,
  signal: AbortSignal,
): Promise<ExamDetailResult> {
  if (parseExamId(id) === null)
    throw new Error('El identificador del examen no es válido.')
  try {
    const response = await httpClient.get<{ data: unknown }>(
      `/teacher/exams/${id}`,
      { signal },
    )
    if (!isExamDetail(response.data.data, id)) {
      throw new Error(
        'El servidor devolvió información incompleta o de otro examen. Inténtalo nuevamente.',
      )
    }
    return { exam: response.data.data, detail: response.data.data }
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404)
      throw error
    // Compatibility is limited to the existing authenticated teacher summary.
    // It must never substitute another record or enable an edit with partial data.
    const response = await httpClient.get<{ data: ManagedExam[] }>(
      '/teacher/dashboard/upcoming-exams',
      { signal },
    )
    const exam = response.data.data.find((item) => item.id === id)
    if (!exam)
      throw new Error(
        'El examen no existe o no está disponible para tu cuenta. Si es anterior, el servidor debe habilitar el detalle completo.',
        { cause: error },
      )
    return { exam, detail: null }
  }
}
