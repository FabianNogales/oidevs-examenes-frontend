import { useId as useReactId } from 'react'

/**
 * Generates a deterministic, accessible id with an optional prefix.
 * If an explicit `idProp` is provided by the consumer, it is returned as-is.
 * Pure, side-effect-free wrapper over React's `useId`.
 */
export function useId(idProp?: string, prefix = 'ds'): string {
  const reactId = useReactId()
  if (idProp && idProp.trim().length > 0) {
    return idProp
  }
  const normalized = String(reactId).replace(/[^a-zA-Z0-9_-]/g, '')
  return `${prefix}-${normalized}`
}
