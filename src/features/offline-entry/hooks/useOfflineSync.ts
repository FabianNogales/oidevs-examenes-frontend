import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { offlineError } from '../api/offlineApi'
import { synchronizeOfflineEntries } from '../services/offlineSync'

export function useOfflineSync(
  ownerId: number,
  examId: number,
  onSaved: () => void,
) {
  const { notify } = useAuth()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function synchronize() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    setSummary(null)
    setProgress(0)
    try {
      const results = await synchronizeOfflineEntries(
        ownerId,
        examId,
        controller.signal,
        (processed) => {
          if (!controller.signal.aborted) {
            setProgress(processed)
            onSaved()
          }
        },
      )
      controller.signal.throwIfAborted()
      const count = (status: string) =>
        results.filter((result) => result.status === status).length
      const message =
        results.length === 0
          ? 'No hay eventos pendientes de envío.'
          : `${count('ACCEPTED')} aceptados · ${count('DUPLICATE')} duplicados · ${count('CONFLICT')} conflictos · ${count('REJECTED')} rechazados.`
      setSummary(message)
      notify('info', message)
    } catch (cause) {
      if (!controller.signal.aborted) setError(offlineError(cause))
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false)
        onSaved()
      }
      if (request.current === controller) request.current = null
    }
  }
  return { busy, progress, error, summary, synchronize }
}
