import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useControllableState } from '@/shared/hooks/useControllableState'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeContextValue {
  /** Selected theme mode (`light`, `dark`, or `system`). */
  theme: ThemeMode
  /** Concrete resolved theme (`light` or `dark`). */
  resolvedTheme: ResolvedTheme
  /** Updates the active theme mode. */
  setTheme: (nextTheme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
})

export interface ThemeProviderProps {
  /** Controlled theme mode. */
  theme?: ThemeMode
  /** Initial theme mode when uncontrolled (defaults to `'light'`). */
  defaultTheme?: ThemeMode
  /** Callback fired when theme mode changes. */
  onThemeChange?: (nextTheme: ThemeMode) => void
  children: ReactNode
}

/**
 * Global ThemeProvider utility:
 * Manages `light` / `dark` / `system` theme state via React context without side effects
 * on `document.documentElement` (preserving the repository's CSS contract).
 */
export function ThemeProvider({
  theme: themeProp,
  defaultTheme = 'light',
  onThemeChange,
  children,
}: ThemeProviderProps) {
  const [theme, setTheme] = useControllableState<ThemeMode>({
    value: themeProp,
    defaultValue: defaultTheme,
    onChange: onThemeChange,
  })

  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', false)
  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
