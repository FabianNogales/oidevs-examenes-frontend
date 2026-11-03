import { useEffect, useState } from 'react'
export function useAttendanceFeed<T extends { poll_after_seconds: number }>(
  scope: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [revision, setRevision] = useState(0),
    [state, setState] = useState<{
      key: string
      data: T | null
      error: string | null
      refreshing: boolean
      paused: boolean
    }>({ key: '', data: null, error: null, refreshing: false, paused: false })
  const key = `${scope}:${revision}`
  useEffect(() => {
    let active = true,
      timer: ReturnType<typeof setTimeout> | undefined,
      controller: AbortController | undefined
    let running = false
    const clear = () => {
      if (timer !== undefined) clearTimeout(timer)
    }
    async function fetchNow() {
      clear()
      if (!active || running) return
      if (document.visibilityState === 'hidden' || !navigator.onLine) {
        setState({
          key,
          data: null,
          error: null,
          refreshing: false,
          paused: true,
        })
        return
      }
      running = true
      controller = new AbortController()
      setState((old) => ({
        key,
        data: old.key === key ? old.data : null,
        error: null,
        refreshing: true,
        paused: false,
      }))
      let seconds = 5
      let retryAllowed = true
      try {
        const data = await load(controller.signal)
        if (active && !controller.signal.aborted) {
          seconds = Math.max(5, Math.min(data.poll_after_seconds, 60))
          setState({ key, data, error: null, refreshing: false, paused: false })
        }
      } catch (e) {
        const status =
          e && typeof e === 'object' && 'status' in e ? e.status : null
        retryAllowed = ![401, 403, 404, 422, 501].includes(status as number)
        if (active && !controller.signal.aborted)
          setState({
            key,
            data: null,
            error:
              e instanceof Error
                ? e.message
                : 'No se pudo actualizar la asistencia.',
            refreshing: false,
            paused: false,
          })
        seconds = 15
      } finally {
        running = false
        if (active && !controller.signal.aborted && retryAllowed)
          timer = setTimeout(() => void fetchNow(), seconds * 1000)
      }
    }
    function pauseOrResume() {
      if (document.visibilityState === 'hidden' || !navigator.onLine) {
        clear()
        controller?.abort()
        setState({
          key,
          data: null,
          error: null,
          refreshing: false,
          paused: true,
        })
      } else if (!running) void fetchNow()
      else {
        clear()
        timer = setTimeout(() => void fetchNow(), 100)
      }
    }
    void fetchNow()
    document.addEventListener('visibilitychange', pauseOrResume)
    window.addEventListener('online', pauseOrResume)
    window.addEventListener('offline', pauseOrResume)
    return () => {
      active = false
      clear()
      controller?.abort()
      document.removeEventListener('visibilitychange', pauseOrResume)
      window.removeEventListener('online', pauseOrResume)
      window.removeEventListener('offline', pauseOrResume)
    }
  }, [key, load])
  const current = state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    refreshing: current ? state.refreshing : true,
    paused: current && state.paused,
    retry: () => setRevision((v) => v + 1),
  }
}
