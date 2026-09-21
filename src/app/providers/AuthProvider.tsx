import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { getRequestStatus } from '@/features/auth/utils/apiErrors'
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
  const [sessionError, setSessionError] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notice, setNotice] = useState<AuthNotice | null>(null)
  const activeVerification = useRef<Promise<AuthenticatedUser | null> | null>(null)
  const sessionVersion = useRef(0)
  const initialRouteKey = useRef(
    (window.history.state as { key?: string } | null)?.key ?? 'default',
  )
  const verifiedRouteKey = useRef<string | null>(null)

  const refreshUser = useCallback((): Promise<AuthenticatedUser | null> => {
    if (activeVerification.current) return activeVerification.current

    const version = sessionVersion.current
    const request = (async () => {
      try {
        const currentUser = env.useAuthMock
          ? getMockCurrentUser()
          : await getCurrentUser()
        if (version !== sessionVersion.current) return null
        setUser(currentUser)
        setSessionError(false)
        return currentUser
      } catch (error) {
        if (version === sessionVersion.current) {
          if (getRequestStatus(error) === 401) {
            setUser(null)
            setSessionError(false)
          } else {
            setSessionError(true)
          }
        }
        return null
      }
    })()

    activeVerification.current = request
    void request.finally(() => {
      if (activeVerification.current === request) {
        activeVerification.current = null
      }
    })
    return request
  }, [])

  const verifySessionForRoute = useCallback(
    async (routeKey: string) => {
      if (verifiedRouteKey.current === routeKey) return
      await refreshUser()
      verifiedRouteKey.current = routeKey
    },
    [refreshUser],
  )

  const clearSession = useCallback(() => {
    sessionVersion.current += 1
    setUser(null)
    setSessionError(false)
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
        await refreshUser()
        verifiedRouteKey.current = initialRouteKey.current
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
  }, [refreshUser])

  const login = useCallback(async (credentials: LoginCredentials) => {
    sessionVersion.current += 1
    await requestLogin(credentials)

    const currentUser = await getCurrentUser()
    setUser(currentUser)
    setSessionError(false)

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
      sessionVersion.current += 1
      setUser(null)
      setSessionError(false)
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      sessionError,
      login,
      logout,
      isLoggingOut,
      refreshUser,
      verifySessionForRoute,
      clearSession,
      notify,
      notice,
      clearNotice,
    }),
    [
      clearNotice,
      clearSession,
      isLoading,
      sessionError,
      isLoggingOut,
      login,
      logout,
      notice,
      notify,
      refreshUser,
      verifySessionForRoute,
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
