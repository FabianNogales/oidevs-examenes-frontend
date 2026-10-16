import { useEffect, useState } from 'react'
import {
  getManagedExams,
  type ExamListFilters,
  type ExamListResult,
} from '@/features/exams/api/examManagementApi'
import { getTeacherDashboardErrorMessage } from '@/shared/api/teacherDashboardError'

export function useManagedExams(filters: ExamListFilters) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    key: string
    result: ExamListResult | null
    error: string | null
  } | null>(null)
  const { view, search, page } = filters
  const key = JSON.stringify([view, search, page, attempt])
  useEffect(() => {
    const controller = new AbortController()
    void getManagedExams({ view, search, page }, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setState({ key, result, error: null })
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            result: null,
            key,
            error: getTeacherDashboardErrorMessage(error),
          })
      },
    )
    return () => {
      controller.abort()
    }
  }, [view, search, page, key])
  const current = state?.key === key ? state : null
  return {
    result: current?.result ?? null,
    error: current?.error ?? null,
    loading: current === null,
    reload: () => setAttempt((value) => value + 1),
  }
}
