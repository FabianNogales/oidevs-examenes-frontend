import { useCallback, useEffect, useRef, useState } from 'react'
import { getEligibilityReasons } from '../api/eligibilitiesApi'
import type { EligibilityReason } from '../types/eligibility.types'

type CatalogState = {
  examId: number
  items: EligibilityReason[]
  loading: boolean
  error: string | null
}

export function useEligibilityReasons(examId: number) {
  const [state, setState] = useState<CatalogState>({
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
      const items = await getEligibilityReasons(examId, controller.signal)
      if (!controller.signal.aborted && mounted.current) {
        setState({ examId, items, loading: false, error: null })
      }
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current) {
        setState({
          examId,
          items: [],
          loading: false,
          error:
            cause instanceof Error
              ? cause.message
              : 'No se pudieron cargar los motivos.',
        })
      }
    } finally {
      if (request.current === controller) request.current = null
    }
  }, [examId])

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
