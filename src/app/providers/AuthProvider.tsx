import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { env } from '@/app/config/env'
import {
  getCurrentUser,
  login as requestLogin,
  logout as requestLogout,
} from '@/features/auth/api/authApi'
import { AuthContext } from '@/app/providers/AuthContext'
import { Snackbar } from '@/shared/components/Snackbar'
import { getMockCurrentUser } from '@/features/auth/mocks/currentUser.mock'
import type {
  AuthNotice,
  AuthNoticeType,
  AuthenticatedUser,
  LoginCredentials,
} from '@/features/auth/types/auth'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notice, setNotice] = useState<AuthNotice | null>(null)

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = env.useAuthMock
        ? getMockCurrentUser()
        : await getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch {
      setUser(null)
      return null
    }
  }, [])

  const clearSession = useCallback(() => {
    setUser(null)
  }, [])

  const notify = useCallback((type: AuthNoticeType, message: string) => {
    setNotice({
      id: Date.now(),
      type,
      message,
    })
  }, [])

  const clearNotice = useCallback(() => {
    setNotice(null)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      try {
        const currentUser = env.useAuthMock
          ? getMockCurrentUser()
          : await getCurrentUser()

        if (isMounted) {
          setUser(currentUser)
        }
      } catch {
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    await requestLogin(credentials)

    const currentUser = await getCurrentUser()
    setUser(currentUser)

    return currentUser
  }, [])

  const logout = useCallback(async () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      if (!env.useAuthMock) {
        await requestLogout()
      }
      setUser(null)
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
      isLoggingOut,
      refreshUser,
      clearSession,
      notify,
      notice,
      clearNotice,
    }),
    [
      clearNotice,
      clearSession,
      isLoading,
      isLoggingOut,
      login,
      logout,
      notice,
      notify,
      refreshUser,
      user,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Snackbar notice={notice} onDismiss={clearNotice} />
    </AuthContext.Provider>
  )
}
