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
  find(tree, 'button', 'Docentes').props.onClick()
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
    find(tree, 'button', 'Estudiantes').props.onClick()
    tree = s.render(items)
    assert.deepEqual(selectedLinks(tree).map(textContent), [expected])
    assert.deepEqual(find(tree, 'NavLink', expected).props.state, { view })
  })
}

test('header: Escape closes the submenu and returns focus to its trigger', () => {
  const s = setup('/admin/rooms')
  const items = s.config.navigationByRole.admin
  let tree = s.render(items)
  find(tree, 'button', 'Aulas').props.onClick()
  tree = s.render(items)
  const trigger = new s.h.Element({ tag: 'button' })
  const item = nodes(
    tree,
    (node) => node.type === 'li' && textContent(node).startsWith('Aulas'),
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
  assert.equal(find(tree, 'button', 'Aulas').props['aria-expanded'], false)
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
