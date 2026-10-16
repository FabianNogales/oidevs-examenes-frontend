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

export async function getManagedExams(
  filters: ExamListFilters,
  signal: AbortSignal,
): Promise<ExamListResult> {
  try {
    const response = await httpClient.get<ExamListResult>('/teacher/exams', {
      params: { ...filters, per_page: 10 },
      signal,
    })
    return response.data
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
