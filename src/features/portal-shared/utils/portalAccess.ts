import type { AuthenticatedUser } from '@/features/auth/types/auth'
import type { HeaderNavigationItem } from '@/shared/components/Header/header.types'

export const PORTAL_SECTIONS = [
  { key: 'news', permission: 'portal.news.update', label: 'Editar noticias', path: '/admin/portal/news' },
  { key: 'events', permission: 'portal.events.update', label: 'Editar calendario', path: '/admin/portal/events' },
  { key: 'sections', permission: 'portal.information.sections.update', label: 'Editar información institucional', path: '/admin/portal/information' },
  { key: 'faqs', permission: 'portal.information.faqs.update', label: 'Editar preguntas frecuentes', path: '/admin/portal/information/faqs' },
  { key: 'services', permission: 'portal.services.update', label: 'Editar servicios', path: '/admin/portal/services' },
] as const

export type PortalSection = typeof PORTAL_SECTIONS[number]['key']

export function getPortalAccess(user: AuthenticatedUser | null, section: PortalSection) {
  const active = user?.status === 'ACTIVE' && !user.must_change_password
  const isAdministrator = Boolean(active && user?.roles.includes('ADMINISTRADOR'))
  const permission = PORTAL_SECTIONS.find((entry) => entry.key === section)!.permission
  const canEdit = Boolean(active && (isAdministrator || user?.permissions?.includes(permission)))
  return { isAdministrator, canEdit }
}

export function getPortalNavigation(user: AuthenticatedUser | null): HeaderNavigationItem[] {
  return PORTAL_SECTIONS.flatMap(({ key, label, path }) => {
    const access = getPortalAccess(user, key)
    return access.canEdit && !access.isAdministrator ? [{ label, to: path, end: true }] : []
  })
}
