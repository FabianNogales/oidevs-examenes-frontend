import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent } from './sourceHarness.mjs'

function setup(pathname, search = '', draft = null, state = null) {
  const location = { pathname, search, state }
  const h = sourceHarness({
    'react-router': { NavLink: 'NavLink', useLocation: () => location },
    '@/features/students/utils/studentImportDraft': {
      useStudentImportDraft: () => draft,
    },
  })
  const config = h.load('shared/components/Header/headerNavigation.config.ts')
  const { isHeaderDestinationActive } = h.load(
    'shared/components/Header/headerNavigationActive.ts',
  )
  const { HeaderNavigation } = h.load(
    'shared/components/Header/HeaderNavigation.tsx',
  )
  return {
    h,
    config,
    location,
    isHeaderDestinationActive,
    render(items, onNavigate) {
      return h.render(() => {
        const content = HeaderNavigation({ items, onNavigate })
        return content.type(content.props)
      })
    },
  }
}

const find = (tree, type, label) =>
  nodes(
    tree,
    (node) => node.type === type && textContent(node).trim() === label,
  )[0]
const selectedLinks = (tree) =>
  nodes(
    tree,
    (node) => node.type === 'NavLink' && node.props['aria-current'] === 'page',
  )

function layoutHeader(roles, pathname, hasCollaborations = false) {
  const h = sourceHarness({
    'react-router': { Outlet: 'Outlet', useLocation: () => ({ pathname, search: '' }), useNavigate: () => () => {} },
    '@/features/auth/hooks/useAuth': { useAuth: () => ({
      user: { display_name: 'Usuario de prueba', roles }, isLoading: false, isLoggingOut: false, logout: async () => {},
    }) },
    '@/features/collaborations/components/CollaborationsProvider': { CollaborationsProvider: 'CollaborationsProvider' },
    '@/features/collaborations/hooks/useMyCollaborations': { useMyCollaborations: () => ({ collaborations: hasCollaborations ? [{}] : [] }) },
    '@/shared/components/Header/Header': { Header: 'Header' },
    '@/shared/components/Footer/Footer': { Footer: 'Footer' },
    '@/shared/components/Snackbar': { Snackbar: 'Snackbar' },
  })
  const { AppLayout } = h.load('layouts/AppLayout/AppLayout.tsx')
  const tree = h.render(() => {
    const content = AppLayout().props.children
    return content.type(content.props)
  })
  const header = nodes(tree, node => node.type === 'Header')[0]
  h.unmount()
  return header.props
}

for (const [authRole, headerRole, pathname] of [
  ['DOCENTE', 'teacher', '/docente'], ['ESTUDIANTE', 'student', '/students/qr'],
  ['ADMINISTRADOR', 'admin', '/admin'],
]) {
  test(`header/AppLayout: ${authRole} keeps its navigation when /me includes an unsupported role`, () => {
    const { config } = setup(pathname)
    for (const roles of [[authRole], [authRole, 'Docente'], [authRole, 'EXTERNAL_ROLE'], ['EXTERNAL_ROLE', authRole]]) {
      const header = layoutHeader(roles, pathname)
      assert.equal(header.user.role, headerRole)
      assert.deepEqual(header.navigation, config.getHeaderNavigation(headerRole))
    }
  })
}

test('header/AppLayout: supported additional roles retain their routes, order and deduplication', () => {
  const { config } = setup('/docente')
  const header = layoutHeader(['ESTUDIANTE', 'EXTERNAL_ROLE', 'DOCENTE', 'ADMINISTRADOR', 'DOCENTE'], '/docente')
  assert.equal(header.user.role, 'admin')
  assert.deepEqual(header.navigation, config.getHeaderNavigation('admin', false, ['student', 'teacher', 'admin', 'teacher']))
  assert.equal(header.navigation.filter(item => item.to === '/').length, 1)
  assert.ok(header.navigation.some(item => item.to === '/students/qr'))
  assert.ok(header.navigation.some(item => item.to === '/teacher/subjects'))
})

test('HU38: calendar is reached from Home, while Header only exposes calendar management to administrators', () => {
  const { config } = setup('/')
  for (const role of [null, 'teacher', 'student', 'admin']) {
    const items = config.getHeaderNavigation(role, true)
    const destinations = items.flatMap(item => [item.to, ...(item.children ?? []).map(child => child.to)])
    assert.equal(destinations.includes('/calendar'), false)
    assert.equal(destinations.includes('/admin/portal/events'), role === 'admin')
  }
})

test('header/AppLayout: temporal collaborator navigation retains the base role and existing label', () => {
  const header = layoutHeader(['ESTUDIANTE', 'EXTERNAL_ROLE'], '/collaborator', true)
  assert.equal(header.user.role, 'student')
  assert.equal(header.user.roleLabel, 'Colaborador temporal')
  assert.equal(header.navigation.filter(item => item.to === '/collaborator').length, 1)
  assert.ok(header.navigation.some(item => item.to === '/students/qr'))
  assert.equal(header.navigation.some(item => item.to?.startsWith('/admin/')), false)
})

test('header/AppLayout: no recognized role uses public navigation without inventing permissions', () => {
  const { config } = setup('/')
  for (const roles of [[], ['Docente'], ['EXTERNAL_ROLE']]) {
    const header = layoutHeader(roles, '/')
    assert.equal(header.user, null)
    assert.deepEqual(header.navigation, config.getHeaderNavigation(null))
  }
})

test('header: path matching respects segment boundaries and explicit exact routes', () => {
  const { isHeaderDestinationActive: active } = setup('/')
  const item = { label: 'Docentes', to: '/admin/teachers' }
  assert.equal(
    active(item, { pathname: '/admin/teachers/1', search: '' }),
    true,
  )
  assert.equal(
    active(item, { pathname: '/admin/teachers-extra', search: '' }),
    false,
  )
  assert.equal(
    active(
      { ...item, end: true },
      { pathname: '/admin/teachers/1', search: '' },
    ),
    false,
  )
  assert.equal(
    active({ label: 'Sin destino' }, { pathname: '/', search: '' }),
    false,
  )
})

test('header: the exam views select one destination and preserve unrelated filters', () => {
  const { config, isHeaderDestinationActive: active } = setup('/')
  const items = config.navigationByRole.teacher.find(
    (item) => item.label === 'Mis exámenes',
  ).children
  for (const [search, label] of [
    ['', 'Próximos y en curso'],
    ['?view=upcoming', 'Próximos y en curso'],
    ['?view=past&search=Redes&page=2', 'Exámenes anteriores'],
    ['?view=cancelled&page=1', 'Exámenes cancelados'],
    ['?view=all', 'Todos los exámenes'],
  ]) {
    assert.deepEqual(
      items
        .filter((item) =>
          active(item, {
            pathname: '/teacher/exams',
            search,
          }),
        )
        .map((item) => item.label),
      [label],
    )
  }
})

test('header: only the most specific assignment link is highlighted', () => {
  const s = setup('/admin/teachers/assignments/import')
  const items = s.config.navigationByRole.admin
  let tree = s.render(items)
  find(tree, 'button', 'Usuarios').props.onClick()
  tree = s.render(items)
  assert.deepEqual(selectedLinks(tree).map(textContent), [
    'Importar asignaciones',
  ])
})

test('header: selecting another view on the same page closes the dropdown', () => {
  const s = setup('/teacher/exams', '?view=all')
  const items = s.config.navigationByRole.teacher
  let navigated = 0
  const render = () => s.render(items, () => navigated++)
  let tree = render()
  find(tree, 'button', 'Mis exámenes').props.onClick()
  tree = render()
  const link = find(tree, 'NavLink', 'Exámenes cancelados')
  assert.equal(link.props.to, '/teacher/exams?view=cancelled')
  link.props.onClick()
  tree = render()
  assert.equal(navigated, 1)
  assert.equal(
    find(tree, 'button', 'Mis exámenes').props['aria-expanded'],
    false,
  )
})

for (const [view, expected] of [
  ['new', 'Importar estudiantes'],
  ['resume', 'Ultima importacion'],
]) {
  test(`header: existing student import ${view} state remains available`, () => {
    const s = setup(
      '/admin/students/import',
      '',
      { previewId: 'existing' },
      { view },
    )
    const items = s.config.navigationByRole.admin
    let tree = s.render(items)
    find(tree, 'button', 'Usuarios').props.onClick()
    tree = s.render(items)
    assert.deepEqual(selectedLinks(tree).map(textContent), [expected])
    assert.deepEqual(find(tree, 'NavLink', expected).props.state, { view })
  })
}

test('header: Escape closes the submenu and returns focus to its trigger', () => {
  const s = setup('/admin/rooms')
  const items = s.config.navigationByRole.admin
  let tree = s.render(items)
  find(tree, 'button', 'Académico').props.onClick()
  tree = s.render(items)
  const trigger = new s.h.Element({ tag: 'button' })
  const item = nodes(
    tree,
    (node) => node.type === 'li' && textContent(node).startsWith('Académico'),
  )[0]
  let prevented = 0
  let stopped = 0
  item.props.onKeyDown({
    key: 'Escape',
    preventDefault: () => prevented++,
    stopPropagation: () => stopped++,
    currentTarget: { querySelector: () => trigger },
  })
  tree = s.render(items)
  assert.equal(find(tree, 'button', 'Académico').props['aria-expanded'], false)
  assert.equal(s.h.document.activeElement, trigger)
  assert.equal(prevented, 1)
  assert.equal(stopped, 1)
})

test('header: student and public navigation do not acquire admin destinations', () => {
  const { config } = setup('/')
  for (const items of [
    config.publicNavigation,
    config.navigationByRole.student,
    config.navigationByRole.teacher,
  ]) {
    const destinations = items.flatMap((item) => [
      item.to,
      ...(item.children ?? []).map((child) => child.to),
    ])
    assert.equal(
      destinations.some((to) => to?.startsWith('/admin/')),
      false,
    )
  }
  assert.equal(
    config.navigationByRole.student.find(
      (item) => item.label === 'Mis exámenes',
    ).to,
    '/students/qr',
  )
})

test('header: HU33 report navigation preserves incident access and has a teacher catalog', () => {
  for (const [path, label] of [
    ['/admin/incidents', 'Incidencias e ingresos irregulares'],
    ['/admin/exam-reports', 'Reportes de exámenes'],
  ]) {
    const s = setup(path)
    const items = s.config.navigationByRole.admin
    let tree = s.render(items)
    find(tree, 'button', 'Académico').props.onClick()
    tree = s.render(items)
    assert.deepEqual(selectedLinks(tree).map(textContent), [label])
    s.h.unmount()
  }
  const s = setup('/teacher/exam-reports')
  assert.ok(
    s.config.navigationByRole.teacher
      .find((item) => item.label === 'Mis exámenes')
      .children.some((item) => item.to === '/teacher/exam-reports'),
  )
  s.h.unmount()
})

const ADMIN_GROUPS = {
  Contenidos: ['/admin/portal/news', '/admin/portal/events', '/admin/portal/information', '/admin/portal/services', '/news'],
  Usuarios: ['/admin/users/manage', '/admin/users/roles', '/admin/users/history', '/admin/teachers', '/admin/teachers/assignments', '/admin/teachers/assignments/import', '/admin/students/manage', '/admin/students/import'],
  Académico: ['/admin/rooms', '/admin/rooms/import', '/admin/subjects', '/admin/subjects/import', '/admin/careers', '/admin/eligibility-policies', '/admin/incidents', '/admin/exam-reports'],
}
const destinations = (items) => items.flatMap(item => item.children ? destinations(item.children) : [item.to])

test('admin header: seven primary entries and every existing destination retained inside its group', () => {
  const { config } = setup('/')
  const items = config.getHeaderNavigation('admin')
  assert.deepEqual(items.map(item => item.label), ['Inicio', 'Contenidos', 'Usuarios', 'Académico', 'Auditoría', 'Información', 'Servicios'])
  for (const [label, paths] of Object.entries(ADMIN_GROUPS)) {
    assert.deepEqual(items.find(item => item.label === label).children.map(child => child.to), paths)
  }
  assert.equal(items.find(item => item.label === 'Información').to, '/information')
  assert.equal(items.find(item => item.label === 'Servicios').to, '/services')
  assert.equal(items.find(item => item.label === 'Auditoría').to, '/admin/audit-logs')
  assert.equal(new Set(destinations(items)).size, destinations(items).length)
})

test('admin header: multi-role accounts retain all routes without duplicating public news', () => {
  const { config } = setup('/')
  const paths = destinations(config.getHeaderNavigation('admin', true, ['teacher', 'student', 'admin']))
  assert.equal(new Set(paths).size, paths.length)
  for (const path of ['/news', '/students/profile', '/students/qr', '/teacher/subjects', '/collaborator']) assert.ok(paths.includes(path), path)
})

for (const [path, group] of [
  ['/admin/portal/news', 'Contenidos'], ['/admin/portal/events', 'Contenidos'],
  ['/admin/portal/information', 'Contenidos'], ['/admin/portal/services', 'Contenidos'],
  ['/admin/eligibility-policies', 'Académico'], ['/admin/eligibility-policies/12', 'Académico'],
  ['/admin/rooms/import', 'Académico'], ['/admin/subjects/import', 'Académico'], ['/admin/careers', 'Académico'],
  ['/admin/teachers/42', 'Usuarios'], ['/admin/teachers/assignments/import', 'Usuarios'],
  ['/admin/students/42', 'Usuarios'], ['/admin/users/42/roles', 'Usuarios'],
]) {
  test(`admin header: ${group} is active on ${path}`, () => {
    const s = setup(path)
    const tree = s.render(s.config.getHeaderNavigation('admin'))
    const active = nodes(tree, node => node.type === 'button' && node.props.className.split(' ').includes('active'))
    assert.deepEqual(active.map(textContent), [group])
    s.h.unmount()
  })
}

test('admin header: unrelated segment prefixes do not activate Usuarios', () => {
  const s = setup('/admin/teachers-extra')
  assert.equal(find(s.render(s.config.getHeaderNavigation('admin')), 'button', 'Usuarios').props.className.includes(' active'), false)
  s.h.unmount()
})

test('admin header: student import resume is added once inside Usuarios without mutating configuration', () => {
  const s = setup('/admin/students/import', '', { previewId: 'saved' }, { view: 'resume' })
  const items = s.config.getHeaderNavigation('admin')
  let tree = s.render(items)
  find(tree, 'button', 'Usuarios').props.onClick()
  tree = s.render(items)
  assert.equal(nodes(tree, node => node.type === 'NavLink' && textContent(node) === 'Ultima importacion').length, 1)
  tree = s.render(items)
  assert.equal(nodes(tree, node => node.type === 'NavLink' && textContent(node) === 'Ultima importacion').length, 1)
  assert.equal(destinations(items).filter(to => to === '/admin/students/import').length, 1)
  s.h.unmount()
})
