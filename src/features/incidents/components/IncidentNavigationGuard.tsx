import { useCallback, useEffect } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

export function IncidentNavigationGuard({ busy }: { busy: boolean }) {
  const blocker = useBlocker(busy)
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (busy) event.preventDefault()
      },
      [busy],
    ),
  )
  useEffect(() => {
    if (!busy && blocker.state === 'blocked') blocker.reset()
  }, [busy, blocker])
  return blocker.state === 'blocked' ? (
    <p role="alert">
      Espera a que termine el registro antes de salir. Así podrás comprobar si
      la incidencia quedó guardada.
    </p>
  ) : null
}
