import { Navigate, Outlet } from 'react-router'
import { SessionLoading } from '@/features/auth/components/SessionLoading'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  AUTH_ROUTES,
  getHomeRouteForUser,
} from '@/features/auth/utils/authRoutes'

export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return <SessionLoading />
  }

  if (isAuthenticated && user) {
    const route = user.must_change_password
      ? AUTH_ROUTES.changeInitialPassword
      : getHomeRouteForUser(user)

    return <Navigate to={route} replace />
  }

  return <Outlet />
}
