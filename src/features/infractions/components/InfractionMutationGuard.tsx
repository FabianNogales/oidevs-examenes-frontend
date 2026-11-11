import { useCallback, useEffect } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

export function InfractionMutationGuard({ busy }: { busy: boolean }) {
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
      Espera a que termine la operación antes de salir. Comprueba el resultado
      en el historial de infracciones.
    </p>
  ) : null
}
