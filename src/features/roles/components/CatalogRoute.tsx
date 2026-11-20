import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import { AdminLayout } from '@/layouts/AdminLayout/AdminLayout'
import { getModuleAccess, type AcademicCatalog } from '../utils/moduleAccess'

// Nested under ProtectedRoute. The remainder of /admin retains its administrator gate.
export function CatalogRoute({ module, operation = 'access' }: {
  module: AcademicCatalog
  operation?: 'access' | 'create' | 'update'
}) {
  const { user } = useAuth()
  const access = getModuleAccess(user, module)
  const allowed = operation === 'create' ? access.canCreate
    : operation === 'update' ? access.canEdit : access.canAccess
  if (!allowed) return <Navigate replace to={user ? getHomeRouteForUser(user) : '/login'}
    state={{ accessDenied: true }} />
  return access.isAdministrator ? <AdminLayout /> : <main><Outlet /></main>
}
