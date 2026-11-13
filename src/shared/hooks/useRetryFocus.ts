import { useCallback, useEffect, useRef } from 'react'

/**
 * Keeps keyboard focus on "Reintentar" when a retry fails again.
 *
 * Error states unmount their retry button while the request is pending, so focus falls to <body>.
 * After a retry finishes with an error, focus returns to the new retry button, but only if focus was
 * lost; it never takes focus from a control the user moved to meanwhile.
 */
export function useRetryFocus(loading: boolean, failed: boolean) {
  const retryRef = useRef<HTMLButtonElement>(null)
  const pending = useRef(false)

  useEffect(() => {
    if (loading || !pending.current) return
    pending.current = false
    const active = document.activeElement
    if (failed && (!active || active === document.body)) retryRef.current?.focus()
  }, [loading, failed])

  const markRetry = useCallback(() => {
    pending.current = true
  }, [])

  return { retryRef, markRetry }
}
