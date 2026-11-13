import { useEffect, useState } from 'react'

function getInitialMatch(query: string, defaultState: boolean): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return defaultState
  }
  return window.matchMedia(query).matches
}

/**
 * Subscribes to a CSS media query string (e.g. `(max-width: 768px)`) and returns
 * whether it currently matches. Safe for SSR and test harnesses without `window.matchMedia`.
 */
export function useMediaQuery(query: string, defaultState = false): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    getInitialMatch(query, defaultState),
  )

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }
    const mediaQueryList = window.matchMedia(query)
    setMatches(mediaQueryList.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', handleChange)
      return () => mediaQueryList.removeEventListener('change', handleChange)
    }
    return undefined
  }, [query])

  return matches
}
