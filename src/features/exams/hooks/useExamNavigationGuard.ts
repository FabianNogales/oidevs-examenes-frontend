import { useCallback, useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

export function useExamNavigationGuard(dirty: boolean, busy: boolean) {
  const allowed = useRef(false)
  const blocker = useBlocker(() => !allowed.current && (dirty || busy))
  useBeforeUnload(
    useCallback(
      (event) => {
        if (!allowed.current && (dirty || busy)) event.preventDefault()
      },
      [dirty, busy],
    ),
  )
  return {
    blocked: blocker.state === 'blocked',
    stay: () => {
      if (blocker.state === 'blocked') blocker.reset()
    },
    discard: () => {
      if (!busy && blocker.state === 'blocked') blocker.proceed()
    },
    allowNavigation: () => {
      allowed.current = true
    },
  }
}
