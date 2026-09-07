import { createContext } from 'react'
import type {
  AuthenticatedUser,
  LoginCredentials,
} from '@/features/auth/types/auth'

export type AuthContextValue = {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
