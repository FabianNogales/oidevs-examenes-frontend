import { useEffect, useRef, useState } from 'react'
import {
  getEntryControlErrorMessage,
  getEntryControlStudents,
} from '../api/entryControlApi'
import type { EntryControlStudentsResponse } from '../types/entryControl.types'

type ListState = {
  key: string
  response: EntryControlStudentsResponse | null
  loading: boolean
  error: string | null
}

export function useEntryControlStudents(examId: number) {
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    roomId: null as number | null,
  })
  const [version, setVersion] = useState(0)
  const [defaultRoomId, setDefaultRoomId] = useState<number | undefined>(
    undefined,
  )
  const [state, setState] = useState<ListState>({
    key: '',
    response: null,
    loading: true,
    error: null,
  })
  const previousSearch = useRef('')
  // The first GET obtains the exam. All subsequent requests explicitly use its room
  // unless the operator selects a different controlled room.
  const roomId = filters.roomId ?? defaultRoomId
  const search = filters.search.trim()
  const key = JSON.stringify([examId, search, filters.page, roomId, version])

  useEffect(() => {
    const controller = new AbortController()
    const delay = previousSearch.current === search ? 0 : 300
    previousSearch.current = search
    setState((current) => ({ ...current, key, loading: true, error: null }))
    const timeout = window.setTimeout(() => {
      void getEntryControlStudents(
        examId,
        {
          search,
          page: filters.page,
          per_page: 10,
          room_id: roomId,
        },
        controller.signal,
      )
        .then((response) => {
          if (!controller.signal.aborted) {
            setDefaultRoomId(response.exam.room?.id)
            setState({ key, response, loading: false, error: null })
          }
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) {
            setState({
              key,
              response: null,
              loading: false,
              error: getEntryControlErrorMessage(cause),
            })
          }
        })
    }, delay)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [examId, search, filters.page, roomId, key])

  const current = state.key === key
  const loading = !current || state.loading
  return {
    response: state.response,
    items:
      !loading && current && !state.error ? (state.response?.data ?? []) : [],
    meta:
      !loading && current && !state.error
        ? (state.response?.meta ?? null)
        : null,
    loading,
    error: current ? state.error : null,
    query: filters.search,
    roomId,
    setQuery: (value: string) =>
      setFilters((current) => ({ ...current, search: value, page: 1 })),
    setPage: (page: number) => setFilters((current) => ({ ...current, page })),
    setRoomId: (roomId: number) =>
      setFilters((current) => ({ ...current, roomId, page: 1 })),
    reload: () => setVersion((current) => current + 1),
  }
}
