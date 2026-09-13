import { createContext } from 'react'

import type { AuthUser } from '@/features/auth/types/auth.types'

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
}

export const AuthContext =
  createContext<AuthContextValue | null>(null)