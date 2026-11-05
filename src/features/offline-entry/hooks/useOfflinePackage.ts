import { useCallback, useEffect, useState } from 'react'
import { readOfflineData } from '../storage/offlineStore'
import { subscribeOfflineData } from '../storage/offlineDatabase'
import { offlineError } from '../api/offlineApi'
import type { LocalEntry, StoredPackage } from '../types/offline.types'

export function useOfflinePackage(ownerId: number, examId: number) {
  const [data, setData] = useState<{
    packages: StoredPackage[]
    entries: LocalEntry[]
  }>({ packages: [], entries: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((current) => current + 1), [])
  useEffect(
    () => subscribeOfflineData(ownerId, examId, reload),
    [ownerId, examId, reload],
  )
  useEffect(() => {
    let active = true
    void readOfflineData(ownerId, examId).then(
      (result) => {
        if (active) {
          setData(result)
          setError(null)
          setLoading(false)
        }
      },
      (cause: unknown) => {
        if (active) {
          setError(offlineError(cause))
          setLoading(false)
        }
      },
    )
    return () => {
      active = false
    }
  }, [ownerId, examId, version])
  return { ...data, stored: data.packages[0] ?? null, loading, error, reload }
}
