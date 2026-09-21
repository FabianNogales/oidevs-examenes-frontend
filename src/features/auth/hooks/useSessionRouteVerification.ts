import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function useSessionRouteVerification() {
  const { isLoading, verifySessionForRoute } = useAuth()
  const location = useLocation()
  const [checkedKey, setCheckedKey] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void verifySessionForRoute(location.key).finally(() => {
      if (active) setCheckedKey(location.key)
    })

    return () => {
      active = false
    }
  }, [location.key, verifySessionForRoute])

  return isLoading || checkedKey !== location.key
}
