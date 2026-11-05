import { useEffect, useRef, useState } from 'react'
import { createIncident, IncidentApiError } from '../api/incidentsApi'
import type {
  CreateIncidentPayload,
  Incident,
  IncidentFieldErrors,
} from '../types/incident.types'
import { validateIncident } from '../utils/incidentValidation'

export function useIncidentSubmission(examId: number) {
  const locked = useRef(false)
  const mounted = useRef(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<IncidentFieldErrors>({})
  const [saved, setSaved] = useState<Incident | null>(null)
  const [forbidden, setForbidden] = useState(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function submit(payload: CreateIncidentPayload) {
    if (locked.current || saved || forbidden) return
    const fields = validateIncident(payload)
    setFieldErrors(fields)
    setError(null)
    if (Object.keys(fields).length) return
    locked.current = true
    setSaving(true)
    try {
      const incident = await createIncident(examId, payload)
      if (mounted.current) setSaved(incident)
      // Keep the lock after success, even before React renders the receipt.
    } catch (cause) {
      locked.current = false
      if (mounted.current) {
        const apiError = cause instanceof IncidentApiError ? cause : null
        setError(
          apiError?.message ??
            'No se pudo completar el registro. Consulta las incidencias antes de reenviarlo.',
        )
        setFieldErrors(apiError?.fieldErrors ?? {})
        setForbidden(apiError?.status === 403 || apiError?.status === 401)
      }
    } finally {
      if (mounted.current) setSaving(false)
    }
  }
  return { submit, saving, saved, error, fieldErrors, forbidden }
}
