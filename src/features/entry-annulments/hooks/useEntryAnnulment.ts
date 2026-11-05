import { useEffect, useRef, useState } from 'react'
import { annulEntry, EntryAnnulmentApiError } from '../api/entryAnnulmentApi'
import type {
  AnnulEntryErrors,
  AnnulEntryPayload,
  AnnulmentHistoryRecord,
} from '../types/entryAnnulment.types'
import { validateEntryAnnulment } from '../utils/entryAnnulmentValidation'

export function useEntryAnnulment(
  examId: number,
  record: AnnulmentHistoryRecord,
) {
  const locked = useRef(false)
  const mounted = useRef(true)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<AnnulmentHistoryRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<AnnulEntryErrors>({})
  const [needsRefresh, setNeedsRefresh] = useState(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function submit(payload: AnnulEntryPayload) {
    if (locked.current) return
    const fields = validateEntryAnnulment(payload)
    setFieldErrors(fields)
    setError(null)
    if (Object.keys(fields).length) return
    locked.current = true
    setBusy(true)
    try {
      const result = await annulEntry(examId, record, payload)
      if (mounted.current) setSaved(result)
    } catch (cause) {
      if (!mounted.current) return
      const failure = cause instanceof EntryAnnulmentApiError ? cause : null
      setError(
        failure?.message ??
          'No se pudo confirmar la anulación. Actualiza el historial antes de repetir la operación.',
      )
      setFieldErrors(failure?.fieldErrors ?? {})
      // Only a rejected validation is safe to correct and submit again without
      // fetching the current record. A lost response may already be persisted.
      if (failure?.status === 422) locked.current = false
      else setNeedsRefresh(true)
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  return { busy, saved, error, fieldErrors, needsRefresh, submit }
}
