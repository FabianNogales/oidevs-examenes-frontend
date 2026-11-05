import { useEffect, useState } from 'react'
import { getIncidentExamCatalog } from '../api/incidentExamCatalogApi'
import type { IncidentExamCatalog } from '../api/incidentExamCatalogApi'

export function useIncidentExamCatalog() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const key = JSON.stringify([query.trim(), page, version])
  const [state, setState] = useState<{
    key: string
    response: IncidentExamCatalog | null
    error: string | null
  }>({ key: '', response: null, error: null })
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void getIncidentExamCatalog(query, page, controller.signal).then(
        (response) => {
          if (!controller.signal.aborted)
            setState({ key, response, error: null })
        },
        (cause: unknown) => {
          if (!controller.signal.aborted)
            setState({
              key,
              response: null,
              error:
                cause instanceof Error
                  ? cause.message
                  : 'No se pudo consultar el catálogo de exámenes.',
            })
        },
      )
    }, 300)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query, page, key])
  const current = state.key === key
  return {
    query,
    setQuery: (value: string) => {
      setQuery(value)
      setPage(1)
    },
    setPage,
    loading: !current,
    response: current ? state.response : null,
    error: current ? state.error : null,
    retry: () => setVersion((v) => v + 1),
  }
}
