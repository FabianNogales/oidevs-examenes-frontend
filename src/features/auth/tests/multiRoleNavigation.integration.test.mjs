// Shared header for multi-role accounts: base-role navigation unchanged and every delegated action
// gathered in a single «Gestión delegada» group, organised in sections (Académico, Contenidos),
// inserted before Información and Enlaces; account menu keeps name and logout.
// Navigation is presentation only: the same access checks drive links and route guards.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent } from '../../../shared/tests/sourceHarness.mjs'

const component = (tree, name) => nodes(tree, (node) => node.type === name || node.type?.name === name)[0]
const destinations = (items) => items.flatMap((item) => [item.to, ...(item.children ?? []).map((child) => child.to)]).filter(Boolean)
const labels = (items) => items.map((item) => item.label)
const delegatedOf = (navigation) => navigation.find((item) => item.label === 'Gestión delegada')
const sectionsOf = (group) => [...new Set(group.children.map((child) => child.section))]
const linksOf = (group, section) => group.children.filter((child) => child.section === section).map((child) => [child.label, child.to])

function setup(roles, permissions = [], overrides = {}, { pathname = '/', collaborations = [] } = {}) {
  const auth = {
    user: { id: 41, display_name: 'Carla Padron Demo', email: 'carla@umss.edu.bo', roles, permissions,
      status: 'ACTIVE', must_change_password: false, ...overrides },
    isAuthenticated: true, isLoading: false, isLoggingOut: false, notify() {}, logout: async () => {},
  }
  const h = sourceHarness({
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '@/shared/components/ui': { Button: 'Button', Card: 'Card', Avatar: 'Avatar' },
    '@/shared/components/ConfirmDialog/ConfirmDialog': { ConfirmDialog: 'ConfirmDialog' },
    '@/layouts/AdminLayout/AdminLayout': { AdminLayout: 'AdminLayout' },
    '@/features/collaborations/components/CollaborationsProvider': { CollaborationsProvider: 'CollaborationsProvider' },
    '@/features/collaborations/hooks/useMyCollaborations': { useMyCollaborations: () => ({ collaborations }) },
    '@/features/students/utils/studentImportDraft': { useStudentImportDraft: () => null },
    '@/shared/components/Footer/Footer': { Footer: 'Footer' },
    '@/shared/components/Snackbar': { Snackbar: 'Snackbar' },
    '@/assets/images/logo-home.png': { __esModule: true, default: 'home-qa.png' },
    '@/assets/images/umss-logo.svg': { __esModule: true, default: 'umss-qa.svg' },
    'react-router': { Link: 'Link', NavLink: 'NavLink', Navigate: 'Navigate', Outlet: 'Outlet',
      useLocation: () => ({ pathname, search: '', state: null }), useNavigate: () => () => {} },
  })
  h.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  const config = h.load('shared/components/Header/headerNavigation.config.ts')
  const delegated = h.load('features/roles/utils/delegatedNavigation.ts')
  const header = () => {
    const { AppLayout } = h.load('layouts/AppLayout/AppLayout.tsx')
    const tree = h.render(() => {
      const content = AppLayout().props.children
      return content.type(content.props)
    })
    return component(tree, 'Header').props
  }
  return Object.assign(h, { auth, config, delegated, header })
}

/**
 * What the account UI shows: the role under the name (desktop trigger and mobile profile) and the
 * account menu content. There is no «Roles permanentes» list and no «+N» counter.
 */
function accountView(h, props) {
  const { HeaderAccount } = h.load('shared/components/Header/HeaderAccount.tsx')
  const { Header } = h.load('shared/components/Header/Header.tsx')
  const byClass = (tree, name) => nodes(tree, (node) => typeof node.props?.className === 'string' && node.props.className.split(' ').some((c) => c === name || c.startsWith(name + '_')) )[0]
  const closed = HeaderAccount({ user: props.user })
  const open = HeaderAccount({ user: props.user, accountOpen: true })
  const menu = nodes(open, (node) => node.props?.role === 'menu')[0]
  const header = h.render(() => Header(props))
  return {
    role: textContent(byClass(closed, 'userRole')),
    name: textContent(byClass(closed, 'userName')),
    menu: textContent(menu).trim(),
    mobileRole: textContent(byClass(header, 'mobileProfileRole')).trim(),
    text: textContent(closed) + textContent(open) + textContent(header),
  }
}

function assertAccount(h, props, role) {
  const view = accountView(h, props)
  assert.equal(view.role, role)
  assert.equal(view.mobileRole, role)
  assert.equal(view.name, 'Carla Padron Demo')
  assert.equal(view.menu, 'Carla Padron DemoCerrar sesión', 'el desplegable solo muestra el nombre y Cerrar sesión')
  assert.doesNotMatch(view.text, /Roles permanentes/)
  assert.doesNotMatch(view.text, /\+\d/)
}

/** Shared invariants: one delegated group at most, no duplicates, no empty sections, no /personal. */
function assertWellFormed(navigation) {
  const all = destinations(navigation)
  assert.equal(new Set(all).size, all.length, 'destinos duplicados: ' + all.join(', '))
  assert.ok(navigation.filter((item) => item.label === 'Gestión delegada').length <= 1, 'un solo grupo delegado')
  assert.equal(navigation.some((item) => ['Académico', 'Contenidos'].includes(item.label)), false, 'sin grupos delegados sueltos')
  for (const item of navigation) {
    if (item.children) assert.ok(item.children.length >= 1, `grupo ${item.label} vacío`)
    else assert.ok(item.to, `entrada ${item.label} sin destino`)
  }
  const group = delegatedOf(navigation)
  if (group) {
    for (const section of sectionsOf(group)) {
      const first = group.children.find((child) => child.section === section)
      assert.ok(['Académico', 'Contenidos'].includes(section), `sección ${section}`)
      assert.equal(first.startsSection, undefined, `${section}: el primer enlace no abre separador`)
    }
    // Secciones contiguas: Académico y después Contenidos.
    assert.deepEqual(group.children.map((child) => child.section).filter((s, i, a) => s !== a[i - 1]), sectionsOf(group))
  }
  assert.equal(all.includes('/personal'), false)
  assert.deepEqual(labels(navigation).slice(-2), ['Información', 'Enlaces'])
}

const PORTAL = ['portal.information.faqs.update', 'portal.services.update']
const CATALOGS = ['rooms.view', 'rooms.create', 'subjects.view', 'course_offerings.view']

test('1. Estudiante: navigation and identity are unchanged, no delegated group', () => {
  const h = setup(['ESTUDIANTE'])
  const props = h.header()
  assert.deepEqual(props.navigation, h.config.getHeaderNavigation('student', false, ['student']))
  assert.equal(delegatedOf(props.navigation), undefined)
  assertAccount(h, props, 'Estudiante')
  assertWellFormed(props.navigation)
  h.unmount()
})

test('1b. Docente: navigation unchanged, no delegated group', () => {
  const h = setup(['DOCENTE'])
  const props = h.header()
  assert.deepEqual(props.navigation, h.config.getHeaderNavigation('teacher', false, ['teacher']))
  assert.equal(delegatedOf(props.navigation), undefined)
  assertWellFormed(props.navigation)
  h.unmount()
})

test('2. Secretaría (custom only): public navigation plus «Gestión delegada»', () => {
  const h = setup(['Secretaría'], [...PORTAL, 'course_offerings.view'])
  const props = h.header()
  assert.equal(props.user.role, 'staff')
  assert.equal(props.user.roleLabel, 'Secretaría', 'solo roles personalizados: el primero real, sin rol base inventado')
  assertAccount(h, props, 'Secretaría')
  assert.deepEqual(labels(props.navigation), ['Inicio', 'Noticias', 'Gestión delegada', 'Información', 'Enlaces'])
  const group = delegatedOf(props.navigation)
  assert.deepEqual(sectionsOf(group), ['Académico', 'Contenidos'])
  assert.deepEqual(linksOf(group, 'Académico'), [['Ofertas', '/admin/teachers/assignments']])
  assert.deepEqual(linksOf(group, 'Contenidos'), [
    ['Editar preguntas frecuentes', '/admin/portal/information/faqs'],
    ['Editar servicios', '/admin/portal/services'],
  ])
  assertWellFormed(props.navigation)
  h.unmount()
})

test('3. Estudiante + Secretaría: student functions intact, one group before Información, account shows only «Estudiante»', () => {
  const h = setup(['ESTUDIANTE', 'Secretaría'], [...PORTAL, 'course_offerings.view'])
  const props = h.header()
  assert.equal(props.user.role, 'student')
  assert.deepEqual(labels(props.navigation),
    ['Inicio', 'Noticias', 'Mis datos', 'Mis exámenes', 'Gestión delegada', 'Información', 'Enlaces'])
  const base = h.config.getHeaderNavigation('student', false, ['student'])
  assert.deepEqual(props.navigation.filter((item) => item.label !== 'Gestión delegada'), base)
  assertWellFormed(props.navigation)
  // Only the primary role under the name, desktop and mobile; the menu shows the name and logout.
  assertAccount(h, props, 'Estudiante')
  h.unmount()
})

test('4. Docente + Secretaría: Académico by module, Contenidos after it; guards match the links', () => {
  const h = setup(['DOCENTE', 'Secretaría'], [...PORTAL, ...CATALOGS])
  const props = h.header()
  assert.equal(props.user.role, 'teacher')
  assertAccount(h, props, 'Docente')
  assert.deepEqual(labels(props.navigation),
    ['Inicio', 'Noticias', 'Mis materias', 'Mis exámenes', 'Gestión delegada', 'Información', 'Enlaces'])
  const group = delegatedOf(props.navigation)
  assert.deepEqual(group.children.map((child) => [child.section, child.label, child.to, child.startsSection ?? false]), [
    ['Académico', 'Aulas', '/admin/rooms', false],
    ['Académico', 'Crear aulas', '/admin/rooms/create', false],
    ['Académico', 'Materias', '/admin/subjects', true],
    ['Académico', 'Ofertas', '/admin/teachers/assignments', true],
    ['Contenidos', 'Editar preguntas frecuentes', '/admin/portal/information/faqs', false],
    ['Contenidos', 'Editar servicios', '/admin/portal/services', false],
  ])
  assert.deepEqual(group.activePrefixes, ['/admin/rooms', '/admin/subjects', '/admin/teachers/assignments', '/admin/portal'])
  assert.ok(destinations(props.navigation).includes('/teacher/subjects'))
  assertWellFormed(props.navigation)

  // Authorized destinations stay reachable; unauthorized ones remain blocked by the same checks.
  const { CatalogRoute } = h.load('features/roles/components/CatalogRoute.tsx')
  const { RoomRoute } = h.load('features/rooms/components/RoomRoute.tsx')
  const { PortalRoute } = h.load('features/portal-shared/components/PortalRoute.tsx')
  assert.notEqual(RoomRoute({ operation: 'access' }).type, 'Navigate')
  assert.notEqual(RoomRoute({ operation: 'create' }).type, 'Navigate')
  assert.equal(CatalogRoute({ module: 'subjects' }).type, 'main')
  assert.equal(CatalogRoute({ module: 'course_offerings' }).type, 'main')
  assert.equal(CatalogRoute({ module: 'subjects', operation: 'create' }).type, 'Navigate')
  assert.equal(CatalogRoute({ module: 'careers' }).type, 'Navigate')
  assert.equal(PortalRoute({ section: 'services' }).type, 'main')
  assert.equal(PortalRoute({ section: 'news' }).type, 'Navigate')
  h.unmount()
})

test('4b. Docente + Secretaría + temporal collaborator: Colaborador kept, one delegated group', () => {
  const h = setup(['DOCENTE', 'Secretaría'], [...PORTAL, ...CATALOGS], {}, { pathname: '/collaborator', collaborations: [{}] })
  const props = h.header()
  assert.equal(props.user.roleLabel, 'Colaborador temporal')
  assertAccount(h, props, 'Colaborador temporal')
  assert.deepEqual(labels(props.navigation),
    ['Inicio', 'Noticias', 'Mis materias', 'Mis exámenes', 'Colaborador', 'Gestión delegada', 'Información', 'Enlaces'])
  assertWellFormed(props.navigation)
  h.unmount()
})

test('5. Administrador (+ custom role): fixed administrator entries including Respaldos, no delegated group', () => {
  const h = setup(['ADMINISTRADOR', 'Secretaría'], [...PORTAL, ...CATALOGS])
  const props = h.header()
  assert.deepEqual(props.navigation, h.config.getHeaderNavigation('admin', false, ['admin']))
  assert.deepEqual(labels(props.navigation), ['Inicio', 'Contenidos', 'Usuarios', 'Académico', 'Auditoría', 'Respaldos', 'Información', 'Enlaces'])
  assert.deepEqual(h.delegated.getDelegatedNavigation(h.auth.user), [])
  assertAccount(h, props, 'Administrador')
  h.unmount()
})

test('6. Several custom roles: merged permissions without duplicates, roles in their original order', () => {
  const h = setup(['Secretaría', 'Comunicaciones', 'Secretaría'],
    ['portal.news.update', 'portal.news.update', 'portal.services.update', 'rooms.view', 'rooms.view'])
  const props = h.header()
  assertAccount(h, props, 'Secretaría')
  assert.deepEqual(labels(props.navigation), ['Inicio', 'Noticias', 'Gestión delegada', 'Información', 'Enlaces'])
  const group = delegatedOf(props.navigation)
  assert.deepEqual(linksOf(group, 'Académico'), [['Aulas', '/admin/rooms']])
  assert.deepEqual(linksOf(group, 'Contenidos'), [['Editar noticias', '/admin/portal/news'], ['Editar servicios', '/admin/portal/services']])
  assertWellFormed(props.navigation)
  h.unmount()
})

test('a single delegated section shows only that section', () => {
  const h = setup(['ESTUDIANTE', 'Secretaría'], ['portal.news.update'])
  const group = delegatedOf(h.header().navigation)
  assert.deepEqual(sectionsOf(group), ['Contenidos'])
  assert.deepEqual(linksOf(group, 'Contenidos'), [['Editar noticias', '/admin/portal/news']])
  h.unmount()
})

for (const [label, overrides] of [['inactiva', { status: 'INACTIVE' }], ['con cambio obligatorio de contraseña', { must_change_password: true }]]) {
  test(`cuenta ${label}: no protected link and no delegated group`, () => {
    const h = setup(['ESTUDIANTE', 'Secretaría'], [...PORTAL, ...CATALOGS], overrides)
    const props = h.header()
    assert.deepEqual(props.navigation, h.config.getHeaderNavigation('student', false, ['student']))
    assert.equal(destinations(props.navigation).some((path) => path.startsWith('/admin')), false)
    h.unmount()
  })
}

test('edit-only permissions keep their direct editor and add no group', () => {
  const h = setup(['DOCENTE', 'Secretaría'], ['subjects.update', 'rooms.update'])
  assert.deepEqual(h.delegated.getDelegatedNavigation(h.auth.user), [])
  const { CatalogRoute } = h.load('features/roles/components/CatalogRoute.tsx')
  assert.equal(CatalogRoute({ module: 'subjects', operation: 'update' }).type, 'main')
  assert.deepEqual(h.header().navigation, h.config.getHeaderNavigation('teacher', false, ['teacher']))
  h.unmount()
})

test('composition drops destinations the base navigation already offers; role labels keep base roles first', () => {
  const h = setup(['Secretaría'], ['rooms.view', 'rooms.create'])
  const base = [{ label: 'Inicio', to: '/' }, { label: 'Aulas', to: '/admin/rooms' }, { label: 'Información', to: '/information' }]
  const result = h.delegated.withDelegatedNavigation(base, h.auth.user)
  assert.deepEqual(labels(result), ['Inicio', 'Aulas', 'Gestión delegada', 'Información'])
  assert.deepEqual(delegatedOf(result).children.map((child) => [child.label, child.to, child.startsSection]),
    [['Crear aulas', '/admin/rooms/create', undefined]])
  assert.deepEqual(h.config.getAccountRoleLabels(['Secretaría', 'ESTUDIANTE', 'DOCENTE']), ['Docente', 'Estudiante', 'Secretaría'])
  h.unmount()
})

test('HeaderNavigation renders sections as labelled groups inside the same dropdown', () => {
  const h = setup(['DOCENTE', 'Secretaría'], [...PORTAL, ...CATALOGS])
  const items = h.header().navigation
  const { HeaderNavigation } = h.load('shared/components/Header/HeaderNavigation.tsx')
  const view = () => h.render(() => {
    const content = HeaderNavigation({ items })
    return content.type(content.props)
  })
  const trigger = nodes(view(), (node) => node.type === 'button' && textContent(node).trim() === 'Gestión delegada')[0]
  assert.equal(trigger.props['aria-expanded'], false)
  trigger.props.onClick()
  const tree = view()
  const groups = nodes(tree, (node) => node.props?.role === 'group')
  assert.deepEqual(groups.map((group) => textContent(nodes(group, (node) => node.props?.id === group.props['aria-labelledby'])[0])), ['Académico', 'Contenidos'])
  assert.deepEqual(nodes(groups[0], (node) => node.type === 'NavLink').map((link) => link.props.to),
    ['/admin/rooms', '/admin/rooms/create', '/admin/subjects', '/admin/teachers/assignments'])
  assert.equal(nodes(tree, (node) => node.type === 'button' && textContent(node).trim() === 'Gestión delegada')[0].props['aria-expanded'], true)
  h.unmount()
})
