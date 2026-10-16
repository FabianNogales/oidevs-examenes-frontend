import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type { TeacherUpcomingExamDto } from '@/features/exams/types/exam.types'

export const EXAM_VIEWS = ['upcoming', 'past', 'cancelled', 'all'] as const
export type ExamView = (typeof EXAM_VIEWS)[number]
export type ExamListFilters = { view: ExamView; search: string; page: number }
export type ManagedExam = TeacherUpcomingExamDto & {
  academic_term_name?: string | null
  course_offering_id?: number
}
export type ExamListResult = {
  data: ManagedExam[]
  meta: { current_page: number; last_page: number; total: number }
  legacy?: boolean
}

function isManagedExam(value: unknown): value is ManagedExam {
  if (typeof value !== 'object' || value === null) return false
  const exam = value as Record<string, unknown>
  return (
    typeof exam.id === 'number' &&
    Number.isSafeInteger(exam.id) &&
    exam.id > 0 &&
    typeof exam.name === 'string' &&
    typeof exam.subject_name === 'string' &&
    typeof exam.subject_code === 'string' &&
    typeof exam.exam_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(exam.exam_date) &&
    (exam.status == null || typeof exam.status === 'string') &&
    (exam.start_time == null || typeof exam.start_time === 'string') &&
    (exam.duration_minutes == null ||
      (typeof exam.duration_minutes === 'number' &&
        Number.isSafeInteger(exam.duration_minutes) &&
        exam.duration_minutes > 0)) &&
    (exam.academic_term_name == null ||
      typeof exam.academic_term_name === 'string') &&
    (exam.evaluation_type == null ||
      ['partial', 'final', 'makeup'].includes(String(exam.evaluation_type))) &&
    (exam.room == null ||
      (typeof exam.room === 'object' &&
        'id' in exam.room &&
        Number.isSafeInteger(exam.room.id) &&
        'name' in exam.room &&
        typeof exam.room.name === 'string' &&
        'code' in exam.room &&
        typeof exam.room.code === 'string'))
  )
}

function hasExamRows(value: unknown): value is ManagedExam[] {
  return (
    Array.isArray(value) &&
    value.every(isManagedExam) &&
    new Set(value.map((exam) => exam.id)).size === value.length
  )
}

export async function getManagedExams(
  filters: ExamListFilters,
  signal: AbortSignal,
): Promise<ExamListResult> {
  try {
    const response = await httpClient.get<ExamListResult>('/teacher/exams', {
      params: { ...filters, per_page: 10 },
      signal,
    })
    const result = response.data
    if (
      !result ||
      !hasExamRows(result.data) ||
      !result.meta ||
      result.meta.current_page !== filters.page ||
      !Number.isSafeInteger(result.meta.last_page) ||
      result.meta.last_page < 1 ||
      !Number.isSafeInteger(result.meta.total) ||
      result.meta.total < result.data.length ||
      result.data.length > 10
    ) {
      throw new Error(
        'El listado de exámenes recibido no tiene el formato esperado.',
      )
    }
    return { data: result.data, meta: result.meta }
  } catch (error) {
    // Preserve the existing tools while the complete catalog endpoint is deployed.
    if (!axios.isAxiosError(error) || error.response?.status !== 404)
      throw error
    if (filters.view !== 'upcoming') {
      return {
        data: [],
        meta: { current_page: 1, last_page: 1, total: 0 },
        legacy: true,
      }
    }
    const response = await httpClient.get<{ data: ManagedExam[] }>(
      '/teacher/dashboard/upcoming-exams',
      { signal },
    )
    if (!hasExamRows(response.data.data))
      throw new Error(
        'El resumen de exámenes recibido no tiene el formato esperado.',
        { cause: error },
      )
    const search = filters.search.toLocaleLowerCase('es').trim()
    const data = response.data.data.filter((exam) =>
      [exam.name, exam.subject_name, exam.subject_code].some((value) =>
        value?.toLocaleLowerCase('es').includes(search),
      ),
    )
    return {
      data,
      meta: { current_page: 1, last_page: 1, total: data.length },
      legacy: true,
    }
  }
}
