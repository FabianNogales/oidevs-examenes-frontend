import { Navigate, Outlet } from 'react-router'

import { SessionLoading } from '@/features/auth/components/SessionLoading'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  AUTH_ROUTES,
  getHomeRouteForUser,
} from '@/features/auth/utils/authRoutes'

import type { AuthRole } from '@/features/auth/types/auth'

interface RoleRouteProps {
  allowedRoles: readonly AuthRole[]
}

export function RoleRoute({
  allowedRoles,
}: RoleRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    user,
  } = useAuth()

  if (isLoading) {
    return <SessionLoading />
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={AUTH_ROUTES.login}
        replace
      />
    )
  }

  if (user.must_change_password) {
    return (
      <Navigate
        to={AUTH_ROUTES.changeInitialPassword}
        replace
      />
    )
  }

  const hasAllowedRole = allowedRoles.some((role) =>
    user.roles.includes(role),
  )

  if (!hasAllowedRole) {
    return (
      <Navigate
        to={getHomeRouteForUser(user)}
        replace
        state={{
          accessDenied: true,
        }}
      />
    )
  }

  return <Outlet />
}