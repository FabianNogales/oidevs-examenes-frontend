import { useEffect, useRef, type RefObject } from 'react'

/**
 * invokes `onOutsideClick` when a pointer/mouse/touch event occurs outside the
 * referenced container element(s).
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null> | ReadonlyArray<RefObject<HTMLElement | null>>,
  onOutsideClick: (event: MouseEvent | TouchEvent) => void,
  enabled = true,
): void {
  const handlerRef = useRef(onOutsideClick)
  handlerRef.current = onOutsideClick

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return

    const refs = Array.isArray(ref) ? ref : [ref]

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null
      if (!target) return

      const isInside = refs.some((itemRef) => {
        const element = itemRef.current
        return element ? element.contains(target) : false
      })

      if (!isInside) {
        handlerRef.current(event)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [ref, enabled])
}
