import { useEffect, useState } from 'react'
import { getEntryControlErrorMessage } from '../api/entryControlApi'
import { getEntryHistory } from '../api/entryQrApi'
import type { EntryHistoryResponse } from '../types/entryQr.types'
import type { AnnulmentHistoryRecord } from '@/features/entry-annulments/types/entryAnnulment.types'

type HistoryPage = Omit<EntryHistoryResponse, 'data'> & {
  data: AnnulmentHistoryRecord[]
}

export function useEntryHistory(examId: number) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const key = JSON.stringify([examId, query.trim(), page, version])
  const [state, setState] = useState<{
    key: string
    response: HistoryPage | null
    loading: boolean
    error: string | null
  }>({ key: '', response: null, loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      void getEntryHistory(
        examId,
        { search: query.trim(), page, per_page: 10 },
        controller.signal,
      )
        .then((response) => {
          if (!controller.signal.aborted)
            setState({ key, response, loading: false, error: null })
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted)
            setState({
              key,
              response: null,
              loading: false,
              error: getEntryControlErrorMessage(
                cause,
                'No se pudo consultar el historial de ingresos.',
              ),
            })
        })
    }, 300)
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [examId, query, page, key])

  const current = state.key === key
  const loading = !current || state.loading
  return {
    query,
    page,
    setPage,
    setQuery: (value: string) => {
      setQuery(value)
      setPage(1)
    },
    reload: () => setVersion((value) => value + 1),
    response: current && !loading ? state.response : null,
    error: current ? state.error : null,
    loading,
  }
}
