import { useEffect, useRef, useState } from 'react'
import { InfractionApiError } from '../api/infractionErrors'
import type { InfractionFieldErrors } from '../types/infraction.types'

export function useInfractionMutation<Payload, Result>(
  write: (payload: Payload) => Promise<Result>,
  validate: (payload: Payload) => InfractionFieldErrors,
) {
  const locked = useRef(false)
  const mounted = useRef(true)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<InfractionFieldErrors>({})
  const [needsRefresh, setNeedsRefresh] = useState(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  async function submit(payload: Payload) {
    if (locked.current) return
    const fields = validate(payload)
    setFieldErrors(fields)
    setError(null)
    if (Object.keys(fields).length) return
    locked.current = true
    setBusy(true)
    try {
      const result = await write(payload)
      if (mounted.current) setSaved(result)
    } catch (cause) {
      if (!mounted.current) return
      const failure = cause instanceof InfractionApiError ? cause : null
      setError(
        failure?.message ??
          'No se pudo confirmar la operación. Consulta el registro antes de volver a intentarlo.',
      )
      setFieldErrors(failure?.fieldErrors ?? {})
      if (failure?.status === 422) locked.current = false
      else setNeedsRefresh(true)
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  return { busy, saved, error, fieldErrors, needsRefresh, submit }
}
