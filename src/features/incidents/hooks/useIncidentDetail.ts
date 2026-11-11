import { useEffect, useState } from 'react'
import { getIncident, IncidentApiError } from '../api/incidentsApi'
import type { Incident } from '../types/incident.types'

export function useIncidentDetail(examId: number, incidentId: number) {
  const [version, setVersion] = useState(0)
  const key = `${examId}:${incidentId}:${version}`
  const [state, setState] = useState<{
    key: string
    incident: Incident | null
    error: string | null
  }>({ key: '', incident: null, error: null })
  useEffect(() => {
    const controller = new AbortController()
    void getIncident(examId, incidentId, controller.signal).then(
      (incident) => {
        if (!controller.signal.aborted) setState({ key, incident, error: null })
      },
      (error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            incident: null,
            error:
              error instanceof IncidentApiError
                ? error.message
                : 'No se pudo consultar la incidencia.',
          })
      },
    )
    return () => controller.abort()
  }, [examId, incidentId, key])
  const current = state.key === key
  return {
    incident: current ? state.incident : null,
    error: current ? state.error : null,
    loading: !current,
    retry: () => setVersion((value) => value + 1),
  }
}
