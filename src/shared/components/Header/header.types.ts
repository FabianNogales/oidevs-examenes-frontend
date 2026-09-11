import type { ReactNode } from 'react'

export type HeaderRole = 'student' | 'teacher' | 'admin'

export interface HeaderNavigationItem {
  label: string
  /** Omit until the destination exists; the item is displayed as unavailable. */
  to?: string
  end?: boolean
}

export interface HeaderUser {
  name: string
  roleLabel: string
}

export interface HeaderProps {
  navigation: readonly HeaderNavigationItem[]
  user: HeaderUser
  notifications?: ReactNode
}
