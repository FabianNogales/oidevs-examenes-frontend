import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getExamEligibilities } from '../api/eligibilitiesApi'
import type { ExamEligibility } from '../types/eligibility.types'

type ListState = {
  examId: number
  items: ExamEligibility[]
  loading: boolean
  error: string | null
}

export function useExamEligibilities(examId: number) {
  const { notify } = useAuth()
  const [state, setState] = useState<ListState>({
    examId,
    items: [],
    loading: true,
    error: null,
  })
  const request = useRef<AbortController | null>(null)
  const mounted = useRef(false)

  const reload = useCallback(async () => {
    if (!mounted.current) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState({ examId, items: [], loading: true, error: null })
    try {
      const items = await getExamEligibilities(examId, controller.signal)
      if (!controller.signal.aborted && mounted.current) {
        setState({ examId, items, loading: false, error: null })
      }
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current) {
        const message =
          cause instanceof Error
            ? cause.message
            : 'No se pudieron cargar las habilitaciones.'
        setState({ examId, items: [], loading: false, error: message })
        notify('error', message)
      }
    } finally {
      if (request.current === controller) request.current = null
    }
  }, [examId, notify])

  useEffect(() => {
    mounted.current = true
    const timeout = window.setTimeout(() => void reload(), 0)
    return () => {
      mounted.current = false
      window.clearTimeout(timeout)
      request.current?.abort()
    }
  }, [reload])

  const current = state.examId === examId
  return {
    items: current ? state.items : [],
    loading: !current || state.loading,
    error: current ? state.error : null,
    reload,
  }
}
