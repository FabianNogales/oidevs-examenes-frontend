import { Navigate, Outlet } from 'react-router'
import { SessionLoading } from '@/features/auth/components/SessionLoading'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  AUTH_ROUTES,
  getHomeRouteForUser,
} from '@/features/auth/utils/authRoutes'

export function FirstAccessRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return <SessionLoading />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={AUTH_ROUTES.login} replace />
  }

  if (!user.must_change_password) {
    return <Navigate to={getHomeRouteForUser(user)} replace />
  }

  return <Outlet />
}
