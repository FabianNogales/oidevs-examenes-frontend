import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import { AdminLayout } from '@/layouts/AdminLayout/AdminLayout'
import { getPortalAccess, type PortalSection } from '../utils/portalAccess'

// Only this section is delegated; the rest of /admin retains its own guards.
export function PortalRoute({ section }: { section: PortalSection }) {
  const { user } = useAuth()
  const access = getPortalAccess(user, section)
  if (!access.canEdit) return <Navigate replace to={user ? getHomeRouteForUser(user) : '/login'}
    state={{ accessDenied: true }} />
  return access.isAdministrator ? <AdminLayout /> : <main><Outlet /></main>
}
