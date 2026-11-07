import { useEffect, useRef, useState } from 'react'
import { portalError } from '../api/portalApi'

export function useRevisionEditor<T extends { revision: number }>(
  initial: T | null,
) {
  const [snapshot, setSnapshot] = useState(initial)
  const [error, setError] = useState<ReturnType<typeof portalError> | null>(
    null,
  )
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const mounted = useRef(false)
  const refreshRequest = useRef<AbortController | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      refreshRequest.current?.abort()
    }
  }, [])

  async function execute(
    action: () => Promise<T>,
    refreshing = false,
  ): Promise<T | null> {
    if (lock.current || (conflict && !refreshing)) return null
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      if (!mounted.current) return null
      setSnapshot(result)
      if (refreshing) setConflict(false)
      return result
    } catch (cause) {
      if (mounted.current) {
        const failure = portalError(cause)
        setError(failure)
        if (failure.status === 409) setConflict(true)
      }
      return null
    } finally {
      lock.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return {
    snapshot,
    error,
    conflict,
    busy,
    locked: busy || conflict,
    clearError: () => {
      if (!conflict) setError(null)
    },
    mutate: (action: () => Promise<T>) => execute(action),
    refresh: (load: (signal: AbortSignal) => Promise<T>) => {
      if (lock.current) return Promise.resolve(null)
      const controller = new AbortController()
      refreshRequest.current = controller
      return execute(() => load(controller.signal), true)
    },
  }
}
