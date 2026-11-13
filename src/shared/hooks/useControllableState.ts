import { useCallback, useRef, useState } from 'react'

export interface UseControllableStateOptions<T> {
  /** Controlled value from the consumer. When defined, the hook operates in controlled mode. */
  value?: T
  /** Initial value used when uncontrolled (`value === undefined`). */
  defaultValue: T
  /** Callback fired whenever the state changes (both controlled and uncontrolled). */
  onChange?: (nextValue: T) => void
}

/**
 * Supports both controlled (`value` + `onChange`) and uncontrolled (`defaultValue`)
 * component state with a single unified tuple API `[state, setState]`.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateOptions<T>): [T, (next: T | ((prev: T) => T)) => void] {
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(defaultValue)
  const isControlled = value !== undefined
  const currentValue = isControlled ? (value as T) : uncontrolledValue

  const valueRef = useRef<T>(currentValue)
  valueRef.current = currentValue

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolvedNext =
        typeof next === 'function'
          ? (next as (prev: T) => T)(valueRef.current)
          : next

      if (!isControlled) {
        setUncontrolledValue(resolvedNext)
      }
      valueRef.current = resolvedNext
      onChangeRef.current?.(resolvedNext)
    },
    [isControlled],
  )

  return [currentValue, setValue]
}
