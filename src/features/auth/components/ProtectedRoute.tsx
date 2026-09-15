import { Navigate, Outlet } from 'react-router'
import { SessionLoading } from '@/features/auth/components/SessionLoading'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AUTH_ROUTES } from '@/features/auth/utils/authRoutes'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return <SessionLoading />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={AUTH_ROUTES.login} replace />
  }

  if (user.must_change_password) {
    return <Navigate to={AUTH_ROUTES.changeInitialPassword} replace />
  }

  return <Outlet />
}
