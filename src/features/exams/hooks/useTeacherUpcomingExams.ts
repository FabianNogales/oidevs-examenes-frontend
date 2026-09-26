import { useCallback, useEffect, useRef, useState } from 'react'
import { getTeacherUpcomingExams } from '@/features/exams/api/teacherExamsApi'
import type { TeacherUpcomingExamDto } from '@/features/exams/types/exam.types'
import { getTeacherDashboardErrorMessage } from '@/shared/api/teacherDashboardError'

export function useTeacherUpcomingExams() {
  const [exams, setExams] = useState<TeacherUpcomingExamDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(false)

  const loadExams = useCallback(async () => {
    if (inFlight.current || !mounted.current) return
    inFlight.current = true
    setIsLoading(true)

    try {
      const result = await getTeacherUpcomingExams()
      if (mounted.current) {
        setExams(result)
        setErrorMessage(null)
      }
    } catch (error) {
      if (mounted.current) {
        setErrorMessage(getTeacherDashboardErrorMessage(error))
      }
    } finally {
      inFlight.current = false
      if (mounted.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const timeoutId = window.setTimeout(() => void loadExams(), 0)
    return () => {
      mounted.current = false
      window.clearTimeout(timeoutId)
    }
  }, [loadExams])

  return { exams, isLoading, errorMessage, loadExams }
}
