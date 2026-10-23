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
  })
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<ListState>({
    key: '',
    response: null,
    loading: true,
    error: null,
  })
  const previousSearch = useRef('')
  // The first GET obtains the exam; later requests use its current assigned room.
  // Derive the ID from the response so a refreshed exam cannot retain an old selection.
  const roomId = state.response?.exam.room?.id
  const search = filters.search.trim()
  const key = JSON.stringify([examId, search, filters.page, roomId, version])

  useEffect(() => {
    let controller: AbortController | null = null
    let boundaryTimer: ReturnType<typeof setTimeout> | undefined
    let resumeTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false
    let pending = false
    const delay = previousSearch.current === search ? 0 : 300
    previousSearch.current = search

    function scheduleBoundary(response: EntryControlStudentsResponse) {
      const exam = response.exam
      const boundary = exam.entry_available
        ? exam.entry_closes_at
        : exam.entry_unavailable_reason === 'EXAM_NOT_STARTED'
          ? exam.entry_opens_at
          : null
      if (!boundary) return
      // Server timestamps only schedule the next GET; they never grant entry.
      const remaining = Date.parse(boundary) - Date.parse(exam.server_time)
      if (!Number.isFinite(remaining) || remaining < 0) return
      // Allow a small margin after the boundary and respect the browser timer limit.
      boundaryTimer = setTimeout(
        () => void refresh(),
        Math.min(remaining + 250, 2_147_483_647),
      )
    }

    async function refresh() {
      if (disposed || pending) return
      clearTimeout(timeout)
      clearTimeout(boundaryTimer)
      clearTimeout(resumeTimer)
      const request = new AbortController()
      controller = request
      pending = true
      setState((current) => ({ ...current, key, loading: true, error: null }))
      try {
        const response = await getEntryControlStudents(
          examId,
          { search, page: filters.page, per_page: 10, room_id: roomId },
          request.signal,
        )
        if (!disposed && !request.signal.aborted) {
          setState({ key, response, loading: false, error: null })
          scheduleBoundary(response)
        }
      } catch (cause: unknown) {
        if (!disposed && !request.signal.aborted) {
          // Retain the last exam context on failure without retrying with no room.
          setState((current) => ({
            ...current,
            key,
            loading: false,
            error: getEntryControlErrorMessage(cause),
          }))
        }
      } finally {
        pending = false
      }
    }

    function resume() {
      clearTimeout(resumeTimer)
      if (document.visibilityState !== 'visible' || pending) return
      // Focus and visibility usually arrive together; share one pending refresh.
      resumeTimer = setTimeout(() => void refresh(), 200)
    }

    setState((current) => ({ ...current, key, loading: true, error: null }))
    const timeout = setTimeout(() => void refresh(), delay)
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      disposed = true
      clearTimeout(timeout)
      clearTimeout(boundaryTimer)
      clearTimeout(resumeTimer)
      controller?.abort()
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
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
    reload: () => setVersion((current) => current + 1),
  }
}
