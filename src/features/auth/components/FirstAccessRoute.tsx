import { Navigate, Outlet, useLocation } from 'react-router'
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
  const location = useLocation()

  if (checkingSession) {
    return <SessionLoading />
  }

  if (sessionError) return <SessionVerificationError />

  if (!isAuthenticated || !user) {
    return <Navigate to={AUTH_ROUTES.login} replace />
  }

  if (!user.must_change_password && !user.must_upload_historical_photo) {
    return <Navigate to={getHomeRouteForUser(user)} replace />
  }

  const stepRoute = getHomeRouteForUser(user)
  if (location.pathname !== stepRoute) return <Navigate to={stepRoute} replace />

  return <Outlet />
}
