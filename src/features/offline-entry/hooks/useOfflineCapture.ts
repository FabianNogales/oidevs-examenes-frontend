import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { captureOfflineEntry } from '../storage/offlineStore'
import { offlineError } from '../api/offlineApi'
import type { OfflinePackage } from '../types/offline.types'

export function useOfflineCapture(
  ownerId: number,
  packet: OfflinePackage,
  onSaved: () => void,
) {
  const { notify } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  async function capture(
    studentId: number,
    method: 'MANUAL' | 'QR',
    token?: string,
  ) {
    if (running.current) return false
    running.current = true
    setBusy(true)
    setError(null)
    try {
      await captureOfflineEntry(ownerId, packet, studentId, method, token)
      if (mounted.current) {
        onSaved()
        notify(
          'info',
          'Ingreso guardado en este dispositivo. Pendiente de sincronización.',
        )
      }
      return true
    } catch (cause) {
      if (mounted.current) setError(offlineError(cause))
      return false
    } finally {
      running.current = false
      if (mounted.current) setBusy(false)
    }
  }
  return { busy, error, capture, clearError: () => setError(null) }
}
