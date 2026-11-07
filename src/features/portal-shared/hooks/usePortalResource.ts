import { useEffect, useState } from 'react'
import { portalError } from '../api/portalApi'

export function usePortalResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{
    load: typeof load | null
    version: number
    data: T | null
    error: ReturnType<typeof portalError> | null
  }>({ load: null, version: -1, data: null, error: null })
  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ load, version, data, error: null })
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setState({ load, version, data: null, error: portalError(cause) })
      })
    return () => controller.abort()
  }, [load, version])
  const current = state.load === load && state.version === version
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current,
    reload: () => setVersion((value) => value + 1),
  }
}
