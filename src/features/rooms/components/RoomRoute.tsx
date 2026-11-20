import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import { getRoomAccess } from '../utils/roomAccess'
import { AdminLayout } from '@/layouts/AdminLayout/AdminLayout'

// Nested inside ProtectedRoute: session and mandatory password change remain shared.
// Only Rooms uses this guard; the rest of /admin keeps its administrator guard.
export function RoomRoute({ operation = 'access' }: {
  operation?: 'access' | 'create' | 'update'
}) {
  const { user } = useAuth()
  const access = getRoomAccess(user)
  const allowed = operation === 'create'
    ? access.canCreate
    : operation === 'update' ? access.canEdit : access.canAccess
  if (!allowed) {
    return <Navigate replace to={user ? getHomeRouteForUser(user) : '/login'}
      state={{ accessDenied: true }} />
  }
  return access.isAdministrator ? <AdminLayout /> : <Outlet />
}
