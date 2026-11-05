import { useEffect, useState } from 'react'

export function useInfractionResource<T>(
  scope: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [version, setVersion] = useState(0)
  const key = `${scope}:${version}`
  const [state, setState] = useState<{
    key: string
    data: T | null
    error: string | null
  }>({ key: '', data: null, error: null })
  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, data, error: null })
      },
      (cause: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : 'No se pudo consultar la información de infracciones.',
          })
      },
    )
    return () => controller.abort()
  }, [key, load])
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: state.key !== key,
    retry: () => setVersion((value) => value + 1),
  }
}
