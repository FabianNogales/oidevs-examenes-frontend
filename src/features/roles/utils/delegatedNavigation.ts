import type { AuthenticatedUser } from '@/features/auth/types/auth'
import type { HeaderNavigationItem } from '@/shared/components/Header/header.types'
import { DELEGATED_MODULES, getModuleAccess } from './moduleAccess'
import { getPortalNavigation } from '@/features/portal-shared/utils/portalAccess'

/** Existing actions only; academic edit-by-ID never gets an incomplete link. */
export function getDelegatedNavigation(user: AuthenticatedUser | null): HeaderNavigationItem[] {
  const catalogs = DELEGATED_MODULES.flatMap(({ key, label, path }) => {
    const access = getModuleAccess(user, key)
    if (access.isAdministrator) return []
    const actions: HeaderNavigationItem[] = []
    if (access.canView) actions.push({ label: `Consultar ${label.toLocaleLowerCase()}`, to: path, end: true })
    if (access.canCreate) actions.push({ label: `Crear ${label.toLocaleLowerCase()}`, to: `${path}/create` })
    if (actions.length === 0) return []
    if (actions.length === 1) return actions
    return [{ label, activePrefixes: [path], children: actions }]
  })
  return [...catalogs, ...getPortalNavigation(user)]
}
