import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import {
  getExamDetail,
  parseExamId,
  type ExamDetailResult,
} from '@/features/exams/api/examDetailsApi'
import { getTeacherDashboardErrorMessage } from '@/shared/api/teacherDashboardError'

export function useExamDetail(examId: string | number | undefined) {
  const id = parseExamId(examId)
  const [attempt, setAttempt] = useState(0)
  const key = `${id}:${attempt}`
  const [state, setState] = useState<{
    key: string
    result: ExamDetailResult | null
    error: string | null
  } | null>(null)
  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (id === null) return
    const controller = new AbortController()
    void getExamDetail(id, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setState({ key, result, error: null })
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            result: null,
            error:
              !axios.isAxiosError(error) && error instanceof Error
                ? error.message
                : getTeacherDashboardErrorMessage(error),
          })
      },
    )
    return () => controller.abort()
  }, [id, key])

  const current = state?.key === key ? state : null
  return {
    exam: current?.result?.exam ?? null,
    detail: current?.result?.detail ?? null,
    isLoading: id !== null && current === null,
    errorMessage:
      id === null
        ? 'El identificador del examen no es válido.'
        : (current?.error ?? null),
    reload,
  }
}
