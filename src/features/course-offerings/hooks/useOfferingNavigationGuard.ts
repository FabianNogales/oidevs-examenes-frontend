import { useCallback, useEffect } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

export function useOfferingNavigationGuard(busy: boolean) {
  const blocker = useBlocker(busy)
  useBeforeUnload(
    useCallback(
      (event) => {
        if (busy) event.preventDefault()
      },
      [busy],
    ),
  )
  useEffect(() => {
    if (blocker.state === 'blocked' && !busy) blocker.reset()
  }, [blocker, busy])
  return blocker.state === 'blocked'
}
