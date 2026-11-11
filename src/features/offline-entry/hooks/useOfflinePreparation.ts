import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getApiErrorCode,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { downloadOfflinePackage, offlineError } from '../api/offlineApi'
import {
  markOfflinePackagesStale,
  saveOfflinePackage,
} from '../storage/offlineStore'
import { assertOfflineOwner } from '../services/offlineIdentity'
import { verifyOfflineShell, type ShellReadiness } from '../services/offlinePwa'

export function useOfflinePreparation(
  ownerId: number,
  examId: number,
  onSaved: () => void,
) {
  const { notify } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shell, setShell] = useState<ShellReadiness | null>(null)
  const active = useRef<AbortController | null>(null)
  useEffect(() => {
    let mounted = true
    void verifyOfflineShell().then((result) => {
      if (mounted) setShell(result)
    })
    return () => {
      mounted = false
      active.current?.abort()
    }
  }, [])
  const download = useCallback(async () => {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    setError(null)
    try {
      const identity = assertOfflineOwner(ownerId)
      const packet = await downloadOfflinePackage(
        examId,
        ownerId,
        controller.signal,
      )
      controller.signal.throwIfAborted()
      assertOfflineOwner(ownerId, identity.contextId)
      await saveOfflinePackage(ownerId, packet)
      controller.signal.throwIfAborted()
      onSaved()
      const readiness = await verifyOfflineShell()
      controller.signal.throwIfAborted()
      setShell(readiness)
      // Never report success until IndexedDB's transaction committed.
      notify(
        readiness.ready ? 'success' : 'info',
        readiness.ready
          ? 'Lista guardada y aplicación disponible para abrir este control sin conexión.'
          : 'Lista guardada en este dispositivo. La apertura de la aplicación sin conexión aún no está confirmada.',
      )
      void navigator.storage?.persist?.().catch(() => {
        /* This permission is only a best-effort durability request. */
      })
    } catch (cause) {
      if (!controller.signal.aborted) {
        const message = offlineError(cause)
        if (
          [
            'DISTRIBUTION_STALE',
            'EXAM_CANCELLED',
            'EXAM_FINISHED',
            'EXAM_ENDED',
            'EXAM_STATE_NOT_ALLOWED',
          ].includes(getApiErrorCode(cause) ?? '') ||
          [403, 404].includes(getRequestStatus(cause) ?? 0)
        )
          await markOfflinePackagesStale(ownerId, examId, message).catch(
            () => {},
          )
        setError(message)
      }
    } finally {
      if (active.current === controller) active.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }, [examId, notify, onSaved, ownerId])
  return { busy, error, shell, download }
}
