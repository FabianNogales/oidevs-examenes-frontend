import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { getIncidentConsultation } from '../api/incidentConsultationApi'
import type {
  IncidentConsultationFilters,
  IncidentConsultationPage,
} from '../types/incidentConsultation.types'
import { readIncidentQuery } from '../utils/incidentConsultationNavigation'

export function useIncidentConsultation(examId: number) {
  const [params, setParams] = useSearchParams()
  const query = readIncidentQuery(params)
  const serialized = params.toString()
  const [version, setVersion] = useState(0)
  const key = JSON.stringify([examId, query, version])
  const [state, setState] = useState<{
    key: string
    response: IncidentConsultationPage | null
    error: string | null
  }>({ key: '', response: null, error: null })

  useEffect(() => {
    const controller = new AbortController()
    const currentQuery = readIncidentQuery(new URLSearchParams(serialized))
    void getIncidentConsultation(examId, currentQuery, controller.signal).then(
      (response) => {
        if (!controller.signal.aborted) setState({ key, response, error: null })
      },
      (cause: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            response: null,
            error:
              cause instanceof Error
                ? cause.message
                : 'No se pudieron consultar las incidencias.',
          })
      },
    )
    return () => controller.abort()
  }, [examId, serialized, key])

  function apply(filters: IncidentConsultationFilters, page = 1) {
    const next = new URLSearchParams()
    if (params.get('from') === 'teacher') next.set('from', 'teacher')
    for (const [field, value] of Object.entries(filters))
      if (value.trim()) next.set(field, value.trim())
    if (page !== 1) next.set('page', String(page))
    setParams(next)
  }

  const current = state.key === key
  return {
    query,
    response: current ? state.response : null,
    error: current ? state.error : null,
    loading: !current,
    apply,
    setPage: (page: number) => {
      const { search, type, status, date_from, date_to } = query
      apply({ search, type, status, date_from, date_to }, page)
    },
    retry: () => setVersion((value) => value + 1),
  }
}
