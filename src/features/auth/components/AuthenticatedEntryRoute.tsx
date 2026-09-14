import { Navigate } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  AUTH_ROUTES,
  getHomeRouteForUser,
} from '@/features/auth/utils/authRoutes'

export function AuthenticatedEntryRoute() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to={AUTH_ROUTES.login} replace />
  }

  return <Navigate to={getHomeRouteForUser(user)} replace />
}
