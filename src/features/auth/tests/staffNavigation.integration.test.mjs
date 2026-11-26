import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { sourceHarness, sourceRoot, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

const component = (tree, name) => nodes(tree, (node) => node.type === name || node.type?.name === name)[0]
const find = (tree, type, label) => nodes(tree,
  (node) => node.type === type && textContent(node).trim() === label)[0]
const destinations = (items) => items.flatMap((item) => [item.to, ...(item.children ?? []).map((child) => child.to)]).filter(Boolean)

function setup(permissions = [], roles = ['Apoyo operativo'], width = 1280) {
  const calls = [], navigation = [], notices = []
  const auth = {
    user: { id: 30, display_name: 'Ana Rojas', email: 'ana@umss.edu.bo', roles, permissions,
      status: 'ACTIVE', must_change_password: false },
    isAuthenticated: true, isLoading: false, isLoggingOut: false, sessionError: null,
    notify: (...args) => notices.push(args),
    login: async (payload) => { calls.push(['login', payload]); return auth.user },
    logout: async () => { calls.push(['logout']) },
    refreshUser: async () => { calls.push(['me']); return auth.user },
  }
  const h = sourceHarness({
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '@/features/auth/hooks/useSessionRouteVerification': { useSessionRouteVerification: () => false },
    '@/features/auth/api/authApi': { updatePassword: async (payload) => {
      calls.push(['updatePassword', payload])
      auth.user = { ...auth.user, must_change_password: false }
    } },
    '@/app/config/env': { env: { institutionalEmailDomains: ['umss.edu.bo'] } },
    '@/shared/api/httpClient': { httpClient: { get: async (path) => { throw new Error('Unexpected API call: ' + path) } } },
    '@/shared/components/ui': { Button: 'Button', Heading: 'Heading', Text: 'Text', Card: 'Card', Avatar: 'Avatar' },
    '@/shared/components/ui/Typography': { Heading: 'Heading', Text: 'Text' },
    '@/shared/components/ConfirmDialog/ConfirmDialog': { ConfirmDialog: 'ConfirmDialog' },
    '@/features/auth/components/AuthInfoPanel': { AuthInfoPanel: 'AuthInfoPanel' },
    '@/features/students/utils/studentImportDraft': { useStudentImportDraft: () => null },
    '@/features/collaborations/components/CollaborationsProvider': { CollaborationsProvider: 'CollaborationsProvider' },
    '@/features/collaborations/hooks/useMyCollaborations': { useMyCollaborations: () => ({ collaborations: [] }) },
    '@/shared/components/Footer/Footer': { Footer: 'Footer' },
    '@/shared/components/Snackbar': { Snackbar: 'Snackbar' },
    '@/assets/images/logo-home.png': { __esModule: true, default: 'home-qa.png' },
    '@/assets/images/umss-logo.svg': { __esModule: true, default: 'umss-qa.svg' },
    '@/features/home/components/TeacherUpcomingExamsSection': { TeacherUpcomingExamsSection: 'TeacherUpcomingExamsSection' },
    '@/features/portal-calendar/components/InstitutionalCalendar': { InstitutionalCalendar: 'InstitutionalCalendar' },
    '@/features/portal-news/components/NewsList': { NewsList: 'NewsList' },
    'react-router': { Link: 'Link', NavLink: 'NavLink', Navigate: 'Navigate', Outlet: 'Outlet',
      useLocation: () => ({ pathname: '/', search: '', state: null }),
      useNavigate: () => (...args) => navigation.push(args) },
  })
  h.window.matchMedia = () => ({ matches: width <= 479, addEventListener() {}, removeEventListener() {} })
  const { getDelegatedNavigation } = h.load('features/roles/utils/delegatedNavigation.ts')
  const { getHeaderNavigation } = h.load('shared/components/Header/headerNavigation.config.ts')
  return Object.assign(h, { auth, calls, navigation, notices, getDelegatedNavigation, getHeaderNavigation })
}

function layoutHeader(h) {
  const { AppLayout } = h.load('layouts/AppLayout/AppLayout.tsx')
  const tree = h.render(() => {
    const content = AppLayout().props.children
    return content.type(content.props)
  })
  return component(tree, 'Header').props
}

function renderNavigation(h, items, onNavigate = () => {}) {
  const { HeaderNavigation } = h.load('shared/components/Header/HeaderNavigation.tsx')
  return h.render(() => {
    const content = HeaderNavigation({ items, onNavigate })
    return content.type(content.props)
  })
}

test('custom-only login goes directly to the existing Home, independently of operational permissions', async () => {
  for (const permissions of [[], ['rooms.create'], ['subjects.view', 'subjects.create'], ['portal.news.update']]) {
    const h = setup(permissions)
    const { LoginForm } = h.load('features/auth/components/LoginForm.tsx')
    let tree = h.render(() => LoginForm({}))
    component(tree, 'AuthField').props.onChange({ target: { value: 'ana@umss.edu.bo' } })
    tree = h.render()
    component(tree, 'PasswordInput').props.onChange('Personal123!')
    tree = h.render()
    await nodes(tree, (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} })
    assert.deepEqual(h.navigation, [['/', { replace: true }]])
    assert.equal(h.calls[0][0], 'login')
    h.unmount()
  }
})

test('first-access login still requires password change, and completion goes to Home', async () => {
  const login = setup(['rooms.create'])
  login.auth.user.must_change_password = true
  const { LoginForm } = login.load('features/auth/components/LoginForm.tsx')
  let tree = login.render(() => LoginForm({}))
  component(tree, 'AuthField').props.onChange({ target: { value: 'ana@umss.edu.bo' } })
  tree = login.render()
  component(tree, 'PasswordInput').props.onChange('Temporal123!')
  tree = login.render()
  await nodes(tree, (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} })
  assert.deepEqual(login.navigation, [['/cambiar-contrasena-inicial', { replace: true }]])
  assert.deepEqual(login.getDelegatedNavigation(login.auth.user), [])
  login.unmount()

  const change = setup(['rooms.create'])
  change.auth.user.must_change_password = true
  const { ChangeInitialPasswordForm } = change.load('features/auth/components/ChangeInitialPasswordForm.tsx')
  tree = change.render(ChangeInitialPasswordForm)
  for (const [name, value] of [['current_password', 'Temporal123!'], ['password', 'Personal456!'],
    ['password_confirmation', 'Personal456!']]) {
    nodes(tree, (node) => node.props?.name === name)[0].props.onChange(value)
    tree = change.render()
  }
  await nodes(tree, (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} })
  assert.deepEqual(change.navigation, [['/', { replace: true }]])
  assert.deepEqual(change.calls.map(([name]) => name), ['updatePassword', 'me'])
  change.unmount()
})

test('entry, guest, first-access and permission guards never send a custom-only account back to /personal', () => {
  const h = setup()
  const { AuthenticatedEntryRoute } = h.load('features/auth/components/AuthenticatedEntryRoute.tsx')
  const { GuestRoute } = h.load('features/auth/components/GuestRoute.tsx')
  const { FirstAccessRoute } = h.load('features/auth/components/FirstAccessRoute.tsx')
  const { ProtectedRoute } = h.load('features/auth/components/ProtectedRoute.tsx')
  const { RoomRoute } = h.load('features/rooms/components/RoomRoute.tsx')
  const { CatalogRoute } = h.load('features/roles/components/CatalogRoute.tsx')
  assert.equal(AuthenticatedEntryRoute().props.to, '/')
  assert.equal(GuestRoute().props.to, '/')
  assert.equal(FirstAccessRoute().props.to, '/')
  assert.equal(ProtectedRoute({ allowedRoles: ['ADMINISTRADOR'] }).props.to, '/')
  assert.equal(RoomRoute({}).props.to, '/')
  assert.equal(CatalogRoute({ module: 'subjects' }).props.to, '/')
  h.auth.user.must_change_password = true
  assert.equal(GuestRoute().props.to, '/cambiar-contrasena-inicial')
  assert.equal(ProtectedRoute({}).props.to, '/cambiar-contrasena-inicial')
  assert.equal(FirstAccessRoute().props.to, '/cambiar-contrasena-inicial')
})

test('Home renders existing public content for staff with no operational permissions and no navigation effect', () => {
  const h = setup()
  const { HomePage } = h.load('features/home/pages/HomePage.tsx')
  const tree = h.render(() => HomePage({}))
  assert.match(textContent(tree), /SISTEMA DE CONTROL/)
  assert.equal(nodes(tree, (node) => node.type === 'Navigate').length, 0)
  assert.equal(component(tree, 'TeacherUpcomingExamsSection'), undefined)
  assert.deepEqual(h.navigation, [])
  const header = layoutHeader(h)
  assert.equal(header.user.name, 'Ana Rojas')
  assert.equal(typeof header.onLogout, 'function')
  assert.ok(destinations(header.navigation).includes('/'))
  assert.equal(destinations(header.navigation).some((path) => path.startsWith('/admin')), false)
  h.unmount()
})

test('/personal remains only a replace redirect under the existing authentication guard; its button page is removed', () => {
  const router = readFileSync(resolve(sourceRoot, 'app/router/router.tsx'), 'utf8')
  assert.match(router, /path:\s*'personal',\s*element:\s*<Navigate to="\/" replace\s*\/>/)
  assert.match(router, /element:\s*<ProtectedRoute\s*\/>[\s\S]*path:\s*'personal'/)
  assert.doesNotMatch(router, /StaffHomePage/)
  assert.equal(existsSync(resolve(sourceRoot, 'features/users/pages/StaffHomePage.tsx')), false)
})

for (const [module, base] of [['rooms', '/admin/rooms'], ['subjects', '/admin/subjects'],
  ['academic_terms', '/admin/academic-terms']]) {
  test(module + ': create-only header link goes to the existing form; no consultation or incomplete editor link', () => {
    const h = setup([module + '.create', module + '.update'])
    assert.deepEqual(destinations(h.getDelegatedNavigation(h.auth.user)), [base + '/create'])
    const header = layoutHeader(h)
    assert.ok(destinations(header.navigation).includes(base + '/create'))
    assert.equal(destinations(header.navigation).includes(base), false)
    assert.equal(destinations(header.navigation).includes('/personal'), false)
    h.unmount()
  })

  test(module + ': consultation and creation are separate links within the shared module dropdown', () => {
    const h = setup([module + '.view', module + '.create'])
    const items = h.getDelegatedNavigation(h.auth.user)
    assert.equal(items.length, 1)
    assert.equal(items[0].to, undefined)
    assert.deepEqual(items[0].children.map((item) => item.to), [base, base + '/create'])
    let tree = renderNavigation(h, items)
    nodes(tree, (node) => node.type === 'button')[0].props.onClick()
    tree = h.render()
    assert.deepEqual(nodes(tree, (node) => node.type === 'NavLink').map((node) => node.props.to), [base, base + '/create'])
    h.unmount()
  })
}

test('edit-only accounts keep direct editors and do not receive generic links without an id', () => {
  const h = setup(['rooms.update', 'subjects.update', 'academic_terms.update'])
  assert.deepEqual(h.getDelegatedNavigation(h.auth.user), [])
  const { RoomRoute } = h.load('features/rooms/components/RoomRoute.tsx')
  const { CatalogRoute } = h.load('features/roles/components/CatalogRoute.tsx')
  assert.equal(RoomRoute({ operation: 'update' }).type, 'Outlet')
  assert.equal(CatalogRoute({ module: 'subjects', operation: 'update' }).type, 'main')
  assert.equal(CatalogRoute({ module: 'academic_terms', operation: 'update' }).type, 'main')
  const header = layoutHeader(h)
  assert.equal(destinations(header.navigation).some((path) => path.includes('/admin/')), false)
  h.unmount()
})

test('read-only catalogs expose their existing consultation and revoked permissions remove all operational links', () => {
  const h = setup(['careers.view', 'course_offerings.view'])
  assert.deepEqual(destinations(h.getDelegatedNavigation(h.auth.user)), ['/admin/careers', '/admin/teachers/assignments'])
  h.auth.user.permissions = []
  assert.deepEqual(h.getDelegatedNavigation(h.auth.user), [])
})

for (const width of [1280, 390]) {
  test('shared header at ' + width + 'px offers permitted actions, closes navigation after selection and keeps logout', async () => {
    const h = setup(['rooms.view', 'rooms.create'], ['Apoyo operativo'], width)
    const headerProps = layoutHeader(h)
    const { Header } = h.load('shared/components/Header/Header.tsx')
    let tree = h.render(() => Header(headerProps))
    let nav = nodes(tree, (node) => node.type === 'nav')[0]
    assert.equal(nav.props['data-open'], false)
    assert.equal(component(tree, 'HeaderAcademicTermsLink'), undefined)
    const items = component(tree, 'HeaderNavigation').props.items
    assert.deepEqual(destinations(items).filter((path) => path.startsWith('/admin')), ['/admin/rooms', '/admin/rooms/create'])
    assert.equal(destinations(items).includes('/personal'), false)
    assert.doesNotMatch(textContent(tree), /Mi cuenta/)

    nodes(tree, (node) => node.props?.['aria-label'] === 'Abrir menú principal')[0].props.onClick()
    tree = h.render()
    nav = nodes(tree, (node) => node.type === 'nav')[0]
    assert.equal(nav.props['data-open'], true)
    assert.equal(nodes(tree, (node) => node.type === 'div' && String(node.props.className).includes('mobileNotifications')).length, 0)

    // The same actual HeaderNavigation renders links at both widths; CSS owns their layout.
    const menu = setup(['rooms.view', 'rooms.create'], ['Apoyo operativo'], width)
    let menuTree = renderNavigation(menu, items, component(tree, 'HeaderNavigation').props.onNavigate)
    // Delegated catalog actions live in «Gestión delegada», section «Académico».
    find(menuTree, 'button', 'Gestión delegada').props.onClick()
    menuTree = menu.render()
    assert.equal(find(menuTree, 'NavLink', 'Aulas').props.to, '/admin/rooms')
    find(menuTree, 'NavLink', 'Crear aulas').props.onClick()
    assert.equal(nodes(h.render(), (node) => node.type === 'nav')[0].props['data-open'], false)

    // Desktop account menu and mobile logout invoke the same confirmation and session handler.
    if (width > 479) component(tree, 'HeaderAccount').props.onLogoutRequest()
    else find(tree, 'button', 'Cerrar sesión').props.onClick()
    tree = h.render()
    const confirm = component(tree, 'ConfirmDialog')
    assert.equal(confirm.props.isOpen, true)
    confirm.props.onConfirm()
    await settle()
    assert.ok(h.calls.some(([method]) => method === 'logout'))
    assert.equal(h.navigation.at(-1)[0], '/login')
    menu.unmount()
    h.unmount()
  })
}

test('authenticated staff auth layout uses the shared action links and hides them during mandatory password change', () => {
  const h = setup(['subjects.create'])
  const { PublicAuthLayout } = h.load('features/auth/components/PublicAuthLayout.tsx')
  const header = component(h.render(() => PublicAuthLayout({ children: 'auth' })), 'Header')
  assert.ok(destinations(header.props.navigation).includes('/admin/subjects/create'))
  assert.equal(destinations(header.props.navigation).includes('/admin/subjects'), false)
  h.auth.user.must_change_password = true
  const firstAccess = component(h.render(), 'Header')
  assert.equal(destinations(firstAccess.props.navigation).some((path) => path.startsWith('/admin')), false)
  h.unmount()
})

for (const width of [1280, 390]) {
  test('portal section editing links in the shared header at ' + width + 'px follow effective /me permissions', () => {
    const h = setup(['portal.news.update', 'portal.information.faqs.update'], ['Comunicaciones'], width)
    const props = layoutHeader(h)
    assert.deepEqual(destinations(props.navigation).filter((path) => path.startsWith('/admin')),
      ['/admin/portal/news', '/admin/portal/information/faqs'])
    assert.ok(destinations(props.navigation).includes('/'))
    assert.equal(destinations(props.navigation).includes('/personal'), false)
    const { Header } = h.load('shared/components/Header/Header.tsx')
    const tree = h.render(() => Header(props))
    assert.doesNotMatch(textContent(tree), /Mi cuenta/)
    const items = component(tree, 'HeaderNavigation').props.items
    const menu = setup([], ['Comunicaciones'], width)
    // Portal editors live in «Gestión delegada», section «Contenidos».
    find(renderNavigation(menu, items), 'button', 'Gestión delegada').props.onClick()
    const navigation = menu.render()
    assert.equal(find(navigation, 'NavLink', 'Editar noticias').props.to, '/admin/portal/news')
    assert.equal(find(navigation, 'NavLink', 'Editar preguntas frecuentes').props.to, '/admin/portal/information/faqs')
    assert.equal(find(navigation, 'NavLink', 'Editar calendario'), undefined)
    assert.equal(find(navigation, 'NavLink', 'Editar servicios'), undefined)
    assert.equal(find(navigation, 'NavLink', 'Editar información institucional'), undefined)
    assert.equal(typeof props.onLogout, 'function')
    menu.unmount()
    h.unmount()

    const withdrawn = setup([], ['Comunicaciones'], width)
    assert.equal(destinations(layoutHeader(withdrawn).navigation).some((path) => path.startsWith('/admin')), false)
    withdrawn.unmount()
  })
}

test('portal permission withdrawal and mandatory password change remove delegated header links', () => {
  const h = setup(['portal.news.update'])
  assert.equal(h.getDelegatedNavigation(h.auth.user)[0].children[0].to, '/admin/portal/news')
  h.auth.user.permissions = []
  assert.deepEqual(h.getDelegatedNavigation(h.auth.user), [])
  h.auth.user.permissions = ['portal.news.update']
  h.auth.user.must_change_password = true
  assert.deepEqual(h.getDelegatedNavigation(h.auth.user), [])
  h.unmount()
})

test('portal permissions preserve custom-only Home and base-role navigation and destinations', () => {
  for (const roles of [['Comunicaciones'], ['ADMINISTRADOR'], ['DOCENTE'], ['ESTUDIANTE']]) {
    const h = setup(['portal.news.update'], roles)
    const { getHomeRouteForUser } = h.load('features/auth/utils/authRoutes.ts')
    assert.equal(getHomeRouteForUser(h.auth.user), roles.includes('DOCENTE') ? '/docente' : '/')
    const header = layoutHeader(h)
    assert.ok(destinations(header.navigation).includes('/'))
    if (roles.includes('ADMINISTRADOR')) assert.deepEqual(h.getDelegatedNavigation(h.auth.user), [])
    else assert.ok(destinations(header.navigation).includes('/admin/portal/news'))
    if (roles.includes('ESTUDIANTE')) assert.ok(destinations(header.navigation).includes('/students/profile'))
    h.unmount()
  }
})

test('administrator, teacher, student and multi-role accounts retain Home priorities, navigation and profile destinations', () => {
  for (const [roles, home, role] of [
    [['ADMINISTRADOR'], '/', 'admin'], [['DOCENTE'], '/docente', 'teacher'],
    [['ESTUDIANTE'], '/', 'student'], [['DOCENTE', 'Apoyo operativo'], '/docente', 'teacher'],
    [['ESTUDIANTE', 'DOCENTE', 'ADMINISTRADOR'], '/', 'admin'],
  ]) {
    const h = setup([], roles)
    const { getHomeRouteForUser } = h.load('features/auth/utils/authRoutes.ts')
    assert.equal(getHomeRouteForUser(h.auth.user), home)
    const header = layoutHeader(h)
    assert.equal(header.user.role, role)
    const additional = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'].filter((item) => roles.includes(item))
      .map((item) => ({ ADMINISTRADOR: 'admin', DOCENTE: 'teacher', ESTUDIANTE: 'student' }[item]))
    assert.deepEqual(header.navigation, h.getHeaderNavigation(role, false, additional))
    if (roles.includes('ESTUDIANTE')) assert.ok(destinations(header.navigation).includes('/students/profile'))
    h.unmount()
  }
})
