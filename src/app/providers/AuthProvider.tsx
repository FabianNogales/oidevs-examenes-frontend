import { useEffect, useState, type ReactNode } from 'react'

import { env } from '@/app/config/env'
import {
  getCurrentUser,
  logout as revokeSession,
} from '@/features/auth/api/authApi'
import { getMockCurrentUser } from '@/features/auth/mocks/currentUser.mock'
import type { AuthUser } from '@/features/auth/types/auth.types'
import { mapCurrentUser } from '@/features/auth/utils/mapCurrentUser'

import { AuthContext } from './authContext'

interface AuthProviderProps {
  children: ReactNode
}

export { AuthContext } from './authContext'

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<AuthUser | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)
  const [isLoggingOut, setIsLoggingOut] =
    useState(false)

  useEffect(() => {
    async function restoreSession() {
      try {
        const currentUser =
          env.useAuthMock && import.meta.env.DEV
            ? getMockCurrentUser()
            : await getCurrentUser()

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

  async function logout() {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      if (!env.useAuthMock) {
        await revokeSession()
      }

      setUser(null)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggingOut,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}