import type { ReactNode } from 'react'

export type HeaderRole = 'student' | 'teacher' | 'admin'

export interface HeaderNavigationItem {
  label: string
  to?: string
  end?: boolean
}

export interface HeaderUser {
  name: string
  role: HeaderRole
  roleLabel?: string
}

export interface HeaderProps {
  user?: HeaderUser | null
  navigation?: readonly HeaderNavigationItem[]
  notifications?: ReactNode
  onLogout?: () => void | Promise<void>
  isLoggingOut?: boolean
}

export interface HeaderNavigationProps {
  items: readonly HeaderNavigationItem[]
  onNavigate?: () => void
}

export interface HeaderAccountProps {
  user?: HeaderUser | null
  notifications?: ReactNode
  onLogout?: () => void | Promise<void>
  isLoggingOut?: boolean
}