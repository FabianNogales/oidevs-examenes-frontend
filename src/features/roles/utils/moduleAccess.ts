import type { AuthenticatedUser } from '@/features/auth/types/auth'
import { getRoomAccess } from '@/features/rooms/utils/roomAccess'

export const DELEGATED_MODULES = [
  { key: 'rooms', label: 'Aulas', path: '/admin/rooms', writable: true },
  { key: 'subjects', label: 'Materias', path: '/admin/subjects', writable: true },
  { key: 'careers', label: 'Carreras', path: '/admin/careers', writable: false },
  { key: 'academic_terms', label: 'Periodos académicos', path: '/admin/academic-terms', writable: true },
  { key: 'course_offerings', label: 'Ofertas', path: '/admin/teachers/assignments', writable: false },
] as const

export type DelegatedModule = typeof DELEGATED_MODULES[number]['key']
export type AcademicCatalog = Exclude<DelegatedModule, 'rooms'>

export function getModuleAccess(user: AuthenticatedUser | null, module: DelegatedModule) {
  if (module === 'rooms') return getRoomAccess(user)
  const active = user?.status === 'ACTIVE' && !user.must_change_password
  const isAdministrator = Boolean(active && user?.roles.includes('ADMINISTRADOR'))
  const writable = DELEGATED_MODULES.find((entry) => entry.key === module)?.writable
  const canView = Boolean(active && (isAdministrator || user?.permissions?.includes(`${module}.view`)))
  const canCreate = Boolean(active && writable && (isAdministrator || user?.permissions?.includes(`${module}.create`)))
  const canEdit = Boolean(active && writable && (isAdministrator || user?.permissions?.includes(`${module}.update`)))
  return { isAdministrator, canView, canCreate, canEdit, canAccess: canView || canCreate || canEdit }
}
