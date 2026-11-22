import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

const career = { id: 1, code: 'SIS', name: 'Sistemas', status: 'ACTIVE' }
const subject = { id: 7, code: 'MAT-7', name: 'Materia histórica', status: 'INACTIVE', careers: [career] }
const editableSubject = { id: 7, code: subject.code, name: subject.name, careers: [career] }
const term = { id: 7, name: 'I/2028', start_date: '2028-01-01', end_date: '2028-06-30', status: 'INACTIVE' }
const page = (data) => ({ data, meta: { current_page: 1, last_page: 1, per_page: 15,
  total: data.length, from: data.length ? 1 : null, to: data.length || null } })
const component = (tree, name) => nodes(tree, (node) => node.type?.name === name)[0]
const form = (tree) => nodes(tree, (node) => node.type === 'form')[0]

function setup(permissions = [], roles = ['Apoyo académico']) {
  const calls = [], navigation = [], notices = []
  const auth = { user: { id: 20, display_name: 'Ana', email: 'ana@example.edu', roles, permissions,
    status: 'ACTIVE', must_change_password: false }, isAuthenticated: true, sessionError: null,
    notify: (...args) => notices.push(args), logout: async () => {}, isLoading: false }
  let handler = async (method, path, payload) => {
    if (method === 'get') {
      const data = path === '/admin/subjects' ? page([subject])
        : path === '/admin/subjects/form-careers' || path === '/admin/subjects/careers' ? { data: [career] }
        : path === '/admin/subjects/7/edit' ? { data: editableSubject }
        : path === '/admin/subjects/7' ? { data: subject }
        : path === '/admin/academic-terms' ? page([term])
        : path === '/admin/academic-terms/active' ? { data: null }
        : path.startsWith('/admin/academic-terms/7') ? { data: term }
        : path === '/admin/course-offerings/periods' ? { data: [{ id: 7, name: term.name, status: 'INACTIVE' }] }
        : path === '/admin/course-offerings' ? page([])
        : path === '/admin/careers' ? page([career]) : { data: career }
      return { data }
    }
    return { data: { data: path.includes('academic-terms') ? { ...term, ...payload }
      : { ...subject, ...payload, status: 'ACTIVE' } } }
  }
  const httpClient = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map((method) => [method, (...args) => {
    calls.push([method, ...args])
    return handler(method, ...args)
  }]))
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient },
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '@/features/auth/hooks/useSessionRouteVerification': { useSessionRouteVerification: () => false },
    '@/layouts/AdminLayout/AdminLayout': { AdminLayout: 'AdminLayout' },
    '@/features/course-offerings/hooks/useOfferingNavigationGuard': { useOfferingNavigationGuard: () => false },
    '@/features/collaborations/components/CollaborationsProvider': { CollaborationsProvider: 'CollaborationsProvider' },
    '@/features/collaborations/hooks/useMyCollaborations': { useMyCollaborations: () => ({ collaborations: [] }) },
    '@/shared/components/Header/Header': { Header: 'Header' },
    '@/shared/components/Footer/Footer': { Footer: 'Footer' },
    '@/shared/components/Snackbar': { Snackbar: 'Snackbar' },
    'react-router': { Link: 'Link', Outlet: 'Outlet', Navigate: 'Navigate',
      useLocation: () => ({ pathname: '/', search: '', state: null }),
      useNavigate: () => (...args) => navigation.push(args), useParams: () => ({ recordId: '7' }),
      useSearchParams: () => [new URLSearchParams()],
      useBlocker: () => ({ state: 'unblocked' }), useBeforeUnload() {} },
  })
  return Object.assign(h, { auth, calls, navigation, notices, setHandler: (next) => { handler = next } })
}

for (const [module, filename, exported, tableName] of [
  ['subjects', 'subjects/pages/AdminSubjectsPage.tsx', 'AdminSubjectsPage', 'AdminSubjectsTable'],
  ['academic_terms', 'academic-terms/pages/AdminAcademicTermsPage.tsx', 'AdminAcademicTermsPage', 'AcademicTermsTable'],
]) {
  test(module + ': view-only retains consultation but hides create, edit, imports and state changes', async () => {
    const h = setup([module + '.view'])
    const Page = h.load('features/' + filename)[exported]
    h.render(Page); await settle()
    const tree = h.render()
    assert.doesNotMatch(textContent(component(tree, 'PageHeader').props.actions), /Registrar|Importar/)
    const table = component(tree, tableName)
    assert.equal(table.props.onEdit, undefined)
    assert.equal(table.props.onStatusChange ?? table.props.onStatus, undefined)
    assert.equal(typeof table.props.onDetail, 'function')
    const rendered = table.type(table.props)
    const dataTable = component(rendered, 'DataTable')
    const actions = dataTable.props.columns.find((column) => column.id === 'actions').cell(module === 'subjects' ? subject : term)
    assert.match(textContent(actions), /Ver detalle/)
    assert.doesNotMatch(textContent(actions), /Editar|Activar|Desactivar/)
    h.unmount()
  })

  test(module + ': view plus create exposes creation without any editing action', async () => {
    const h = setup([module + '.view', module + '.create'])
    const Page = h.load('features/' + filename)[exported]
    h.render(Page); await settle()
    const tree = h.render()
    assert.match(textContent(component(tree, 'PageHeader').props.actions), /Registrar/)
    assert.equal(component(tree, tableName).props.onEdit, undefined)
    h.unmount()
  })

  test(module + ': create-only mounts the existing dialog without requesting its listing', () => {
    const h = setup([module + '.create'])
    const { CatalogWorkspacePage } = h.load('features/roles/pages/CatalogWorkspacePage.tsx')
    const tree = h.render(() => CatalogWorkspacePage({ module }))
    const dialog = component(tree, module === 'subjects' ? 'SubjectDialog' : 'AcademicTermDialog')
    assert.equal(dialog.props.selection.mode, 'create')
    assert.equal(component(tree, exported), undefined)
    assert.equal(h.calls.length, 0)
    h.unmount()
  })

  test(module + ': direct routes require the exact operation and never open the rest of the admin panel', () => {
    const h = setup([module + '.create'])
    const { CatalogRoute } = h.load('features/roles/components/CatalogRoute.tsx')
    const allowed = CatalogRoute({ module, operation: 'create' })
    assert.equal(allowed.type, 'main')
    assert.equal(nodes(allowed, (node) => node.type === 'Outlet').length, 1)
    assert.equal(CatalogRoute({ module, operation: 'update' }).type, 'Navigate')
    const { ProtectedRoute } = h.load('features/auth/components/ProtectedRoute.tsx')
    assert.equal(h.render(() => ProtectedRoute({ allowedRoles: ['ADMINISTRADOR'] })).props.to, '/')
    h.auth.user.permissions = []
    assert.equal(CatalogRoute({ module }).props.to, '/')
    h.auth.user.must_change_password = true
    assert.equal(h.render(() => ProtectedRoute({})).props.to, '/cambiar-contrasena-inicial')
    h.unmount()
  })
}

test('subject create-only loads only form career choices and submits without catalog consultation', async () => {
  const h = setup(['subjects.create'])
  const { SubjectForm } = h.load('features/subjects/components/SubjectForm.tsx')
  const saved = []
  h.render(() => SubjectForm({ onCancel() {}, onSaved: (value) => saved.push(value), onBusyChange() {} }))
  await settle()
  let tree = h.render()
  for (const [name, value] of [['code', 'NUEVA-01'], ['name', 'Materia nueva']]) {
    nodes(tree, (node) => node.type === 'input' && node.props.name === name)[0].props.onChange({ target: { value } })
  }
  component(tree, 'SubjectCareerSelector').props.onChange([1])
  tree = h.render()
  await form(tree).props.onSubmit({ preventDefault() {} })
  assert.deepEqual(h.calls.map(([method, path]) => [method, path]), [
    ['get', '/admin/subjects/form-careers'], ['post', '/admin/subjects'],
  ])
  assert.deepEqual(h.calls[1][2], { code: 'NUEVA-01', name: 'Materia nueva', career_ids: [1] })
  assert.equal(saved.length, 1)
  h.unmount()
})

test('subject edit-only fetches the selected editor and does not gain detail or list consultation', async () => {
  const h = setup(['subjects.update'])
  const { SubjectDialog } = h.load('features/subjects/components/SubjectDialog.tsx')
  const render = () => {
    const dialog = SubjectDialog({ selection: { mode: 'edit', subjectId: 7 }, onClose() {}, onSaved() {} })
    const existing = component(dialog, 'ExistingSubject')
    return existing.type(existing.props)
  }
  h.render(render); await settle()
  const tree = h.render()
  assert.deepEqual(component(tree, 'SubjectForm').props.subject, editableSubject)
  assert.deepEqual(h.calls.map(([method, path]) => [method, path]), [['get', '/admin/subjects/7/edit']])
  h.unmount()
})

test('period create-only cannot choose activation and submits INACTIVE without any GET', async () => {
  const h = setup(['academic_terms.create'])
  const { AcademicTermForm } = h.load('features/academic-terms/components/AcademicTermForm.tsx')
  const saved = []
  let tree = h.render(() => AcademicTermForm({ allowActivation: false, onCancel() {},
    onSaved: (value) => saved.push(value), onBusyChange() {} }))
  const fields = component(tree, 'AcademicTermFields')
  assert.equal(fields.props.allowActivation, false)
  const renderedFields = fields.type(fields.props)
  assert.equal(nodes(renderedFields, (node) => node.props?.name === 'status').length, 0)
  for (const [name, value] of [['name', 'I/2028'], ['start_date', '2028-01-01'], ['end_date', '2028-06-30'],
    ['status', 'ACTIVE']]) fields.props.onChange(name, value)
  tree = h.render()
  await form(tree).props.onSubmit({ preventDefault() {} })
  assert.deepEqual(h.calls, [['post', '/admin/academic-terms', { name: 'I/2028',
    start_date: '2028-01-01', end_date: '2028-06-30', status: 'INACTIVE' }]])
  assert.equal(saved.length, 1)
  h.unmount()
})

test('period edit-only loads one target and saving keeps status out of PUT', async () => {
  const h = setup(['academic_terms.update'])
  const { AcademicTermDialog } = h.load('features/academic-terms/components/AcademicTermDialog.tsx')
  h.render(() => AcademicTermDialog({ selection: { mode: 'edit', termId: 7 }, onClose() {}, onSaved() {} }))
  await settle()
  const tree = h.render()
  assert.equal(component(tree, 'AcademicTermForm').props.term.id, 7)
  assert.deepEqual(h.calls.map(([method, path]) => [method, path]), [['get', '/admin/academic-terms/7/edit']])
  const { editAcademicTerm } = h.load('features/academic-terms/api/academicTermMutationsApi.ts')
  await editAcademicTerm(7, { ...term, status: 'ACTIVE' })
  assert.deepEqual(h.calls[1].slice(0, 3), ['put', '/admin/academic-terms/7', {
    name: term.name, start_date: term.start_date, end_date: term.end_date,
  }])
  h.unmount()
})

test('consultation details have no edit transition when permission is absent', () => {
  const h = setup(['subjects.view', 'academic_terms.view'])
  const { SubjectDetails } = h.load('features/subjects/components/SubjectDetails.tsx')
  const { AcademicTermDetails } = h.load('features/academic-terms/components/AcademicTermDetails.tsx')
  assert.doesNotMatch(textContent(SubjectDetails({ subject, onClose() {} })), /Editar materia/)
  assert.doesNotMatch(textContent(AcademicTermDetails({ term, onClose() {} })), /Editar periodo/)
})

test('Ofertas read view reuses its panel without administrative links or mutation actions', async () => {
  const h = setup(['course_offerings.view'])
  const { AdminCourseOfferingsPage } = h.load('features/course-offerings/pages/AdminCourseOfferingsPage.tsx')
  const tree = h.render(AdminCourseOfferingsPage)
  assert.equal(component(tree, 'CourseOfferingsPanel').props.editable, false)
  assert.equal(component(tree, 'PageHeader').props.actions, false)
  assert.equal(nodes(tree, (node) => node.props?.to === '/admin/teachers').length, 0)
  // A separate harness keeps hook slots isolated from the page.
  const choices = setup(['course_offerings.view'])
  const useChoices = choices.load('features/course-offerings/hooks/useOfferingPeriods.ts').useOfferingPeriods
  choices.render(useChoices); await settle()
  assert.deepEqual(choices.render().state.periods, [{ id: 7, name: term.name, status: 'INACTIVE' }])
  assert.deepEqual(choices.calls.map(([method, path]) => [method, path]), [['get', '/admin/course-offerings/periods']])
  choices.unmount()
  h.unmount()
})

test('Carreras reuses the existing read page, with no nonexistent create or edit permissions', async () => {
  const h = setup(['careers.view'])
  const { CatalogWorkspacePage } = h.load('features/roles/pages/CatalogWorkspacePage.tsx')
  const selected = CatalogWorkspacePage({ module: 'careers' })
  assert.equal(selected.type.name, 'AdminReadPage')
  const readPage = selected.type(selected.props)
  h.render(() => readPage.type(readPage.props)); await settle()
  const tree = h.render()
  assert.equal(component(tree, 'DataTable').props.entityLabel, 'carreras')
  assert.equal(component(tree, 'DataTable').props.onToggleStatus, undefined)
  const { getModuleAccess } = h.load('features/roles/utils/moduleAccess.ts')
  assert.equal(getModuleAccess(h.auth.user, 'careers').canCreate, false)
  assert.equal(getModuleAccess(h.auth.user, 'careers').canEdit, false)
  h.unmount()
})

test('staff header reflects effective actions and removes links after withdrawal', () => {
  const h = setup(['subjects.create', 'academic_terms.update', 'careers.view', 'course_offerings.view'])
  const { AppLayout } = h.load('layouts/AppLayout/AppLayout.tsx')
  const content = AppLayout().props.children
  const header = nodes(h.render(() => content.type(content.props)), (node) => node.type === 'Header')[0]
  // Delegated actions are grouped («Académico»): check every destination, including group children.
  const entries = (navigation) => navigation.flatMap((entry) => [entry, ...(entry.children ?? [])])
  assert.ok(entries(header.props.navigation).some((entry) => entry.to === '/admin/subjects/create'))
  assert.equal(entries(header.props.navigation).some((entry) => entry.to === '/admin/subjects'), false)
  assert.equal(entries(header.props.navigation).some((entry) => entry.to === '/admin/academic-terms'), false)
  assert.ok(entries(header.props.navigation).some((entry) => entry.to === '/admin/careers'))
  assert.equal(entries(header.props.navigation).some((entry) => entry.to === '/admin/rooms'), false)
  h.auth.user.permissions = []
  const next = nodes(h.render(), (node) => node.type === 'Header')[0]
  assert.equal(entries(next.props.navigation).some((entry) => entry.to?.startsWith('/admin')), false)
  h.unmount()
})

test('administrator retains the layout, imports, editing, state changes and initial period activation', async () => {
  const h = setup([], ['ADMINISTRADOR'])
  const { CatalogRoute } = h.load('features/roles/components/CatalogRoute.tsx')
  assert.equal(CatalogRoute({ module: 'subjects' }).type, 'AdminLayout')
  const Page = h.load('features/subjects/pages/AdminSubjectsPage.tsx').AdminSubjectsPage
  h.render(Page); await settle()
  const tree = h.render()
  assert.match(textContent(component(tree, 'PageHeader').props.actions), /Importar materias/)
  assert.equal(typeof component(tree, 'AdminSubjectsTable').props.onEdit, 'function')
  assert.equal(typeof component(tree, 'AdminSubjectsTable').props.onStatusChange, 'function')
  const admin = setup([], ['ADMINISTRADOR'])
  const Dialog = admin.load('features/academic-terms/components/AcademicTermDialog.tsx').AcademicTermDialog
  const dialog = admin.render(() => Dialog({ selection: { mode: 'create' }, onClose() {}, onSaved() {} }))
  assert.equal(component(dialog, 'AcademicTermForm').props.allowActivation, true)
  const { getModuleAccess } = h.load('features/roles/utils/moduleAccess.ts')
  assert.equal(getModuleAccess(h.auth.user, 'rooms').canView, true)
  admin.unmount()
  h.unmount()
})

test('Aulas retains its independent create-only entry while other catalog permissions stay separate', () => {
  const h = setup(['rooms.create', 'subjects.view'])
  const { RoomWorkspacePage } = h.load('features/rooms/pages/RoomWorkspacePage.tsx')
  const { RoomRoute } = h.load('features/rooms/components/RoomRoute.tsx')
  assert.equal(RoomWorkspacePage().type.name, 'RoomWritePage')
  assert.equal(RoomRoute({ operation: 'create' }).type, 'Outlet')
  assert.equal(RoomRoute({ operation: 'update' }).type, 'Navigate')
  const { getModuleAccess } = h.load('features/roles/utils/moduleAccess.ts')
  assert.equal(getModuleAccess(h.auth.user, 'subjects').canCreate, false)
})
