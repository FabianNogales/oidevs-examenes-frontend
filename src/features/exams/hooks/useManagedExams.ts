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
    result: ExamListResult | null
    loading: boolean
    error: string | null
  }>({ result: null, loading: true, error: null })
  const { view, search, page } = filters
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setState({ result: null, loading: true, error: null })
      void getManagedExams({ view, search, page }, controller.signal).then(
        (result) => {
          if (!controller.signal.aborted)
            setState({ result, loading: false, error: null })
        },
        (error: unknown) => {
          if (!controller.signal.aborted)
            setState({
              result: null,
              loading: false,
              error: getTeacherDashboardErrorMessage(error),
            })
        },
      )
    }, 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [view, search, page, attempt])
  return { ...state, reload: () => setAttempt((value) => value + 1) }
}
