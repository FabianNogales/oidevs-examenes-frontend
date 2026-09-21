import { useState } from 'react'
import { SessionLoading } from '@/features/auth/components/SessionLoading'
import { useAuth } from '@/features/auth/hooks/useAuth'
import styles from './SessionVerificationError.module.css'

export function SessionVerificationError() {
  const { refreshUser } = useAuth()
  const [retrying, setRetrying] = useState(false)

  async function retry() {
    setRetrying(true)
    try {
      await refreshUser()
    } finally {
      setRetrying(false)
    }
  }

  if (retrying) return <SessionLoading />

  return (
    <main className={styles.error}>
      <p role="alert">No se pudo verificar tu sesión.</p>
      <button type="button" className="primary-button" onClick={() => void retry()}>
        Reintentar
      </button>
    </main>
  )
}
