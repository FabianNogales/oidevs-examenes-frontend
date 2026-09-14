import { useEffect } from 'react'
import type { AuthNotice } from '@/features/auth/types/auth'

type SnackbarProps = {
  notice: AuthNotice | null
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 5000

export function Snackbar({ notice, onDismiss }: SnackbarProps) {
  useEffect(() => {
    if (!notice) {
      return
    }

    const timeoutId = window.setTimeout(onDismiss, AUTO_DISMISS_MS)

    return () => window.clearTimeout(timeoutId)
  }, [notice, onDismiss])

  if (!notice) {
    return null
  }

  const role = notice.type === 'error' ? 'alert' : 'status'

  return (
    <div className={`snackbar snackbar--${notice.type}`} role={role}>
      <span>{notice.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Cerrar mensaje">
        ×
      </button>
    </div>
  )
}
