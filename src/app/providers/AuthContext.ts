import { createContext } from 'react'
import type {
  AuthNotice,
  AuthNoticeType,
  AuthenticatedUser,
  LoginCredentials,
} from '@/features/auth/types/auth'

export type AuthContextValue = {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isLoggingOut: boolean
  login: (credentials: LoginCredentials) => Promise<AuthenticatedUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthenticatedUser | null>
  clearSession: () => void
  notify: (type: AuthNoticeType, message: string) => void
  notice: AuthNotice | null
  clearNotice: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
