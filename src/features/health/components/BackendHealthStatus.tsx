import { useEffect, useState } from 'react'
import { getHealthStatus } from '@/features/health/api/healthApi'

type BackendStatus = 'checking' | 'connected' | 'unavailable'

export function BackendHealthStatus() {
  const [status, setStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    let isMounted = true

    getHealthStatus()
      .then(() => {
        if (isMounted) {
          setStatus('connected')
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus('unavailable')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (status === 'checking') {
    return <p className="backend-status">Comprobando backend...</p>
  }

  return (
    <p className="backend-status">
      {status === 'connected' ? 'Backend conectado' : 'Backend no disponible'}
    </p>
  )
}
