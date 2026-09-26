import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { subscribeToAuthSessionEvents } from '@/features/auth/utils/authEvents'
import { AUTH_ROUTES } from '@/features/auth/utils/authRoutes'

export function AuthEventHandler() {
  const { clearSession, isAuthenticated, notify } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(
    () =>
      subscribeToAuthSessionEvents(({ reason }) => {
        const hadSession = isAuthenticated
        const shouldNotify = reason === 'SESSION_REPLACED' || hadSession

        clearSession()

        if (!shouldNotify) {
          return
        }

        notify(
          'error',
          reason === 'SESSION_REPLACED'
            ? 'Tu sesión fue cerrada porque se inició sesión en otro dispositivo.'
            : 'Tu sesión expiró. Ingresa nuevamente.',
        )

        if (location.pathname !== AUTH_ROUTES.login) {
          navigate(AUTH_ROUTES.login, { replace: true })
        }
      }),
    [clearSession, isAuthenticated, location.pathname, navigate, notify],
  )

  return <Outlet />
}
