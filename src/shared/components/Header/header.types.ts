// Presentation context only: "staff" is not a global authorization role.
export type HeaderRole = 'student' | 'teacher' | 'admin' | 'staff'

export interface HeaderNavigationItem {
  label: string
  to?: string
  end?: boolean
  defaultSearchParams?: Readonly<Record<string, string>>
  activePrefixes?: readonly string[]
  startsSection?: boolean
  children?: HeaderNavigationItem[]
}

export interface HeaderUser {
  name: string
  role: HeaderRole
  roleLabel?: string
}

export interface HeaderProps {
  user?: HeaderUser | null
  navigation?: readonly HeaderNavigationItem[]
  onLogout?: () => void | Promise<void>
  isLoggingOut?: boolean
}

export interface HeaderNavigationProps {
  items: readonly HeaderNavigationItem[]
  onNavigate?: () => void
}

export interface HeaderAccountProps {
  user?: HeaderUser | null
  /** Abre la confirmación de cierre de sesión (la gestiona Header). */
  onLogoutRequest?: () => void
  isLoggingOut?: boolean
  accountOpen?: boolean
  onAccountOpenChange?: (open: boolean) => void
}
