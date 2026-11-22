import type { AuthenticatedUser } from '@/features/auth/types/auth'
import type { HeaderNavigationItem } from '@/shared/components/Header/header.types'
import { DELEGATED_MODULES, getModuleAccess } from './moduleAccess'
import { getPortalNavigation } from '@/features/portal-shared/utils/portalAccess'

/** Public entries that close the header; the delegated group is inserted before them. */
const TRAILING_LABELS = ['Información', 'Enlaces', 'Servicios']

export const DELEGATED_GROUP_LABEL = 'Gestión delegada'
const ACADEMIC_SECTION = 'Académico'
const CONTENTS_SECTION = 'Contenidos'
const BASE_ROLES = new Set(['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'])

/**
 * One «Gestión delegada» group whose links keep their section (Académico, Contenidos).
 * The first link of each section never opens a separator: the section heading already does.
 * Nothing is returned when no delegated link remains.
 */
function delegatedGroup(links: HeaderNavigationItem[], activePrefixes: string[]): HeaderNavigationItem[] {
  if (links.length === 0) return []
  const children = links.map((link, index) => {
    if (index > 0 && links[index - 1].section === link.section) return link
    const first = { ...link }
    delete first.startsSection
    return first
  })
  return [{ label: DELEGATED_GROUP_LABEL, activePrefixes, children }]
}

/**
 * Delegated actions from the existing access checks, gathered in a single «Gestión delegada»
 * group organised by section: Académico (one block per catalog module) and Contenidos (portal editors).
 * Academic edit-by-ID never gets an incomplete link. Administrators keep their fixed header.
 */
export function getDelegatedNavigation(user: AuthenticatedUser | null): HeaderNavigationItem[] {
  const academic: HeaderNavigationItem[] = []
  const prefixes: string[] = []
  for (const { key, label, path } of DELEGATED_MODULES) {
    const access = getModuleAccess(user, key)
    if (access.isAdministrator) continue
    const links: HeaderNavigationItem[] = []
    if (access.canView) links.push({ label, to: path, end: true, section: ACADEMIC_SECTION })
    if (access.canCreate) links.push({ label: `Crear ${label.toLocaleLowerCase()}`, to: `${path}/create`, section: ACADEMIC_SECTION })
    if (links.length === 0) continue
    // Each module starts its own block inside the section, as in the administrator menu.
    links[0] = { ...links[0], startsSection: true }
    academic.push(...links)
    prefixes.push(path)
  }
  const contents = getPortalNavigation(user).map((link) => ({ ...link, section: CONTENTS_SECTION }))
  if (contents.length) prefixes.push('/admin/portal')
  return delegatedGroup([...academic, ...contents], prefixes)
}

/** Presentation only: label for an authorised delegated screen; never changes roles or access.
 * Effective permissions do not identify which custom role granted them, so multiple custom roles
 * use the neutral «Gestión delegada» label rather than attributing the permission to one role.
 */
export function getDelegatedRoleLabel(
  user: AuthenticatedUser | null,
  pathname: string,
): string | undefined {
  if (!user || user.roles.includes('ADMINISTRADOR')) return undefined
  const customRoles = [...new Set(user.roles.filter((role) => !BASE_ROLES.has(role) && role.trim()))]
  if (customRoles.length === 0) return undefined

  const path = pathname.replace(/\/+$/, '')
  const catalogAccess = DELEGATED_MODULES.some(({ key, path: catalogPath }) => {
    const access = getModuleAccess(user, key)
    if (path === catalogPath) return access.canAccess
    if (path === `${catalogPath}/create`) return access.canCreate
    if (path.startsWith(`${catalogPath}/`) && /^\/[1-9]\d*\/edit$/.test(path.slice(catalogPath.length))) {
      return access.canEdit
    }
    return false
  })
  const portalAccess = getPortalNavigation(user).some((item) => item.to === path)
  if (!catalogAccess && !portalAccess) return undefined
  return customRoles.length === 1 ? customRoles[0] : DELEGATED_GROUP_LABEL
}

const destinationsOf = (items: readonly HeaderNavigationItem[]): string[] =>
  items.flatMap((item) => [...(item.to ? [item.to] : []), ...destinationsOf(item.children ?? [])])

/**
 * Inserts «Gestión delegada» before «Información» and «Enlaces» and drops any destination
 * the base navigation already offers. Without delegated access the base navigation is returned as is.
 */
export function withDelegatedNavigation(
  base: readonly HeaderNavigationItem[],
  user: AuthenticatedUser | null,
): HeaderNavigationItem[] {
  const seen = new Set(destinationsOf(base))
  const unseen = (item: HeaderNavigationItem) => {
    if (!item.to || seen.has(item.to)) return false
    seen.add(item.to)
    return true
  }
  const delegated = getDelegatedNavigation(user).flatMap((item) =>
    delegatedGroup((item.children ?? []).filter(unseen), [...(item.activePrefixes ?? [])]))
  if (delegated.length === 0) return [...base]
  const index = base.findIndex((item) => TRAILING_LABELS.includes(item.label))
  const at = index < 0 ? base.length : index
  return [...base.slice(0, at), ...delegated, ...base.slice(at)]
}
