import { useEffect, useState } from 'react'
import { getIncidents, IncidentApiError } from '../api/incidentsApi'
import type { IncidentsPage } from '../types/incident.types'

export function useIncidents(examId: number) {
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const key = `${examId}:${page}:${version}`
  const [state, setState] = useState<{
    key: string
    response: IncidentsPage | null
    error: string | null
  }>({ key: '', response: null, error: null })

  useEffect(() => {
    const controller = new AbortController()
    void getIncidents(examId, page, controller.signal).then(
      (response) => {
        if (!controller.signal.aborted) setState({ key, response, error: null })
      },
      (error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            response: null,
            error:
              error instanceof IncidentApiError
                ? error.message
                : 'No se pudieron consultar las incidencias.',
          })
      },
    )
    return () => controller.abort()
  }, [examId, page, key])

  const current = state.key === key
  return {
    response: current ? state.response : null,
    error: current ? state.error : null,
    loading: !current,
    setPage,
    retry: () => setVersion((value) => value + 1),
  }
}
