import type { AuthenticatedUser } from '@/features/auth/types/auth'

export function getRoomAccess(user: AuthenticatedUser | null) {
  const active = user?.status === 'ACTIVE' && !user.must_change_password
  const isAdministrator = Boolean(active && user?.roles.includes('ADMINISTRADOR'))
  const canView = Boolean(active && (isAdministrator || user?.permissions?.includes('rooms.view')))
  const canCreate = Boolean(active && (isAdministrator || user?.permissions?.includes('rooms.create')))
  const canEdit = Boolean(active && (isAdministrator || user?.permissions?.includes('rooms.update')))
  return { isAdministrator, canView, canCreate, canEdit, canAccess: canView || canCreate || canEdit }
}
