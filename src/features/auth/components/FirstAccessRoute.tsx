import { Navigate, Outlet } from 'react-router'
import { SessionLoading } from '@/features/auth/components/SessionLoading'
import { SessionVerificationError } from '@/features/auth/components/SessionVerificationError'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSessionRouteVerification } from '@/features/auth/hooks/useSessionRouteVerification'
import {
  AUTH_ROUTES,
  getHomeRouteForUser,
} from '@/features/auth/utils/authRoutes'

export function FirstAccessRoute() {
  const { isAuthenticated, sessionError, user } = useAuth()
  const checkingSession = useSessionRouteVerification()

  if (checkingSession) {
    return <SessionLoading />
  }

  if (sessionError) return <SessionVerificationError />

  if (!isAuthenticated || !user) {
    return <Navigate to={AUTH_ROUTES.login} replace />
  }

  if (!user.must_change_password) {
    return <Navigate to={getHomeRouteForUser(user)} replace />
  }

  return <Outlet />
}
