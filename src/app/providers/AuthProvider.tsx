import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { getCurrentUser } from '@/features/auth/api/authApi'
import { mapCurrentUser } from '@/features/auth/utils/mapCurrentUser'

import type {
  AuthUser,
} from '@/features/auth/types/auth.types'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
}

export const AuthContext =
  createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<AuthUser | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  useEffect(() => {
    async function restoreSession() {
      try {
        const currentUser =
          await getCurrentUser()

        setUser(
          mapCurrentUser(currentUser),
        )
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    void restoreSession()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}