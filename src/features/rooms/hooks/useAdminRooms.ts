import { useEffect, useState } from 'react'
import { getAdminRooms, getRoomsErrorMessage } from '../api/adminRoomsApi'
import type { RoomsQuery, RoomsResponse } from '../types/room.types'

type RoomsState =
  | { status: 'loading'; result: null; error: null }
  | { status: 'ready'; result: RoomsResponse; error: null }
  | { status: 'error'; result: null; error: string }

export function useAdminRooms(query: RoomsQuery) {
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState<RoomsState>({
    status: 'loading',
    result: null,
    error: null,
  })
  const { page, search, status } = query

  useEffect(() => {
    const controller = new AbortController()
    getAdminRooms({ page, search, status }, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted)
          setState({ status: 'ready', result, error: null })
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            result: null,
            error: getRoomsErrorMessage(error),
          })
      },
    )
    return () => controller.abort()
  }, [page, search, status, retry])

  function reload() {
    setState({ status: 'loading', result: null, error: null })
    setRetry((value) => value + 1)
  }

  function markLoading() {
    setState({ status: 'loading', result: null, error: null })
  }

  return { ...state, reload, markLoading }
}
