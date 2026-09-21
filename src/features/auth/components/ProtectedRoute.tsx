import { Navigate, Outlet, useLocation } from 'react-router'
import { SessionLoading } from '@/features/auth/components/SessionLoading'
import { SessionVerificationError } from '@/features/auth/components/SessionVerificationError'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSessionRouteVerification } from '@/features/auth/hooks/useSessionRouteVerification'
import { AUTH_ROUTES, getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import type { AuthRole } from '@/features/auth/types/auth'

type ProtectedRouteProps = {
  allowedRoles?: readonly AuthRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, sessionError, user } = useAuth()
  const location = useLocation()
  const checkingSession = useSessionRouteVerification()

  if (checkingSession) {
    return <SessionLoading />
  }

  if (sessionError) return <SessionVerificationError key={location.key} />

  if (!isAuthenticated || !user) {
    return <Navigate to={AUTH_ROUTES.login} replace />
  }

  if (user.must_change_password) {
    return <Navigate to={AUTH_ROUTES.changeInitialPassword} replace />
  }

  if (allowedRoles && !allowedRoles.some((role) => user.roles.includes(role))) {
    return <Navigate to={getHomeRouteForUser(user)} replace />
  }

  return <Outlet />
}
