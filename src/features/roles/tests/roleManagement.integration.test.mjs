import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

const custom = { id: 10, name: 'Apoyo operativo', status: 'ACTIVE', is_custom: true, is_protected: false,
  revision: 1, permission_keys: ['rooms.view'] }
const base = { id: 1, name: 'ADMINISTRADOR', status: 'ACTIVE', is_custom: false, is_protected: true,
  revision: 1, permission_keys: [] }
const permissions = ['view', 'create', 'update'].map((action) => ({ key: `rooms.${action}`, module: 'Aulas',
  label: { view: 'Consultar aulas', create: 'Crear aulas', update: 'Editar aulas' }[action],
  description: 'Acción de aulas', is_configurable: true, is_enabled: false }))
const account = { id: 30, first_names: 'Ana', last_names: 'Rojas', full_name: 'Ana Rojas',
  email: 'personal@umss.edu.bo', identity_number: '00987654', institutional_code: null,
  status: 'ACTIVE', roles: [{ id: custom.id, name: custom.name }],
  student_id: null, teacher_id: null, student_status: null, teacher_status: null }

function setup() {
  const calls = [], notices = []
  let handler = async (_method, path) => ({ data: { data: path === '/admin/roles' ? [base, custom]
    : path === '/admin/permissions' ? permissions : custom } })
  const auth = { user: { id: 1, display_name: 'Administrador', roles: ['ADMINISTRADOR'], must_change_password: false },
    notify: (...args) => notices.push(args), logout: async () => calls.push(['logout']), isLoading: false, isAuthenticated: true }
  const httpClient = Object.fromEntries(['get', 'post', 'patch', 'delete'].map((method) => [method, (...args) => {
    calls.push([method, ...args]); return handler(method, ...args)
  }]))
  const navigation = []
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient },
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '@/features/auth/hooks/useSessionRouteVerification': { useSessionRouteVerification: () => false },
    'react-router': { Link: 'Link', Navigate: 'Navigate', Outlet: 'Outlet',
      useLocation: () => ({ pathname: '/', search: '', state: null }),
      useNavigate: () => (...args) => navigation.push(args) },
    '@/features/collaborations/components/CollaborationsProvider': { CollaborationsProvider: 'CollaborationsProvider' },
    '@/features/collaborations/hooks/useMyCollaborations': { useMyCollaborations: () => ({ collaborations: [] }) },
    '@/shared/components/Header/Header': { Header: 'Header' },
    '@/shared/components/Footer/Footer': { Footer: 'Footer' },
    '@/shared/components/Snackbar': { Snackbar: 'Snackbar' },
  })
  return Object.assign(h, { calls, notices, auth, navigation, setHandler: (next) => { handler = next } })
}
const form = (tree) => nodes(tree, (node) => node.type === 'form')[0]
const field = (tree, label) => nodes(tree, (node) => node.props?.label === label && typeof node.props.children === 'function')[0]
const control = (tree, label) => field(tree, label).props.children({ id: label })

test('catalog management loads real roles separately from account assignments and explains separate room actions', async () => {
  const h = setup(), { AdminRolesPage } = h.load('features/roles/pages/AdminRolesPage.tsx')
  h.render(AdminRolesPage); await settle(); let tree = h.render()
  const table = nodes(tree, (node) => node.props?.entityLabel === 'roles')[0]
  assert.equal(table.props.data.length, 2)
  assert.equal(table.props.columns.find((column) => column.id === 'type').cell(base), 'Base protegido')
  assert.match(textContent(tree), /Importación y cambios de estado siguen reservados/)
  assert.ok(nodes(tree, (node) => node.props?.to === '/admin/users/assignments').length)
  table.props.onViewProfile(custom); await settle(); tree = h.render()
  assert.equal(nodes(tree, (node) => node.type?.name === 'RoleEditorDialog')[0].props.role.id, custom.id)
  assert.ok(h.calls.some(([, path]) => path === '/admin/roles/10'))
  assert.equal(h.calls.some(([, path]) => path === '/admin/rooms'), false)
  h.unmount()
})

test('role editor creates once with selected catalog keys and does not grant administrative flags', async () => {
  const h = setup(), saved = [], { RoleEditorDialog } = h.load('features/roles/components/RoleEditorDialog.tsx')
  const render = () => RoleEditorDialog({ role: null, permissions, onClose() {}, onSaved: (role) => saved.push(role) })
  let tree = h.render(render)
  control(tree, 'Nombre del rol').props.onChange({ target: { value: 'Apoyo operativo' } })
  nodes(tree, (node) => node.type?.name === 'PermissionPicker')[0].props.onChange(['rooms.view'])
  tree = h.render()
  let finish
  h.setHandler(() => new Promise((resolve) => { finish = resolve }))
  const first = form(tree).props.onSubmit({ preventDefault() {} })
  form(tree).props.onSubmit({ preventDefault() {} })
  assert.equal(h.calls.length, 1)
  assert.deepEqual(h.calls[0], ['post', '/admin/roles', { name: custom.name, permission_keys: ['rooms.view'] }])
  finish({ data: { data: custom } }); await first
  assert.equal(saved.length, 1)
  h.unmount()
})

for (const original of [null, { ...custom, permission_keys: [] }]) {
  test((original ? 'editing' : 'creating') + ' a custom role preserves four module permissions when reopened', async () => {
    const catalog = [
      ['rooms.view', 'Aulas'], ['subjects.view', 'Materias'],
      ['academic_terms.create', 'Periodos académicos'], ['careers.view', 'Carreras'],
    ].map(([key, module]) => ({ key, module, label: key, description: 'Permiso asignable',
      is_configurable: true, is_enabled: true }))
    const keys = catalog.map((permission) => permission.key)
    let persisted
    const h = setup()
    h.setHandler(async (method, path, payload) => {
      assert.equal(method, original ? 'patch' : 'post')
      assert.equal(path, original ? '/admin/roles/10' : '/admin/roles')
      assert.deepEqual(payload.permission_keys, keys)
      if (original) assert.equal(payload.revision, original.revision)
      persisted = { ...custom, name: payload.name, revision: original ? original.revision + 1 : 1,
        permission_keys: [...payload.permission_keys].sort() }
      return { data: { data: persisted } }
    })
    const saved = []
    const { RoleEditorDialog } = h.load('features/roles/components/RoleEditorDialog.tsx')
    let tree = h.render(() => RoleEditorDialog({ role: original, permissions: catalog,
      onClose() {}, onSaved: (role) => saved.push(role) }))
    if (!original) {
      control(tree, 'Nombre del rol').props.onChange({ target: { value: custom.name } })
      tree = h.render()
    }
    for (const permission of catalog) {
      const picker = nodes(tree, (node) => node.type?.name === 'PermissionPicker')[0]
      const check = nodes(picker.type(picker.props),
        (node) => node.type?.name === 'Checkbox' && node.props.label === permission.label)[0]
      assert.equal(check.props.disabled, false)
      check.props.onChange({ target: { checked: true } })
      tree = h.render()
    }
    await form(tree).props.onSubmit({ preventDefault() {} })
    assert.equal(h.calls.length, 1)
    assert.equal(saved.length, 1)
    assert.deepEqual(saved[0].permission_keys, [...keys].sort())
    h.unmount()

    // Reopen through the management page's GET detail, rather than the previous editor state.
    const reopened = setup()
    reopened.setHandler(async (method, path) => {
      assert.equal(method, 'get')
      return { data: { data: path === '/admin/roles' ? [base, persisted]
        : path === '/admin/permissions' ? catalog : persisted } }
    })
    const { AdminRolesPage } = reopened.load('features/roles/pages/AdminRolesPage.tsx')
    reopened.render(AdminRolesPage)
    await settle()
    tree = reopened.render()
    const table = nodes(tree, (node) => node.props?.entityLabel === 'roles')[0]
    assert.equal(table.props.columns.find((column) => column.id === 'permissions').cell(persisted), 4)
    table.props.onViewProfile(persisted)
    await settle()
    tree = reopened.render()
    const dialog = nodes(tree, (node) => node.type?.name === 'RoleEditorDialog')[0]
    assert.deepEqual(dialog.props.role.permission_keys, [...keys].sort())
    assert.ok(reopened.calls.some(([method, path]) => method === 'get' && path === '/admin/roles/10'))

    const editor = setup()
    const OpenEditor = editor.load('features/roles/components/RoleEditorDialog.tsx').RoleEditorDialog
    const openTree = editor.render(() => OpenEditor(dialog.props))
    const picker = nodes(openTree, (node) => node.type?.name === 'PermissionPicker')[0]
    const checked = nodes(picker.type(picker.props), (node) => node.type?.name === 'Checkbox')
    assert.equal(checked.length, 4)
    assert.ok(checked.every((check) => check.props.checked && !check.props.disabled))
    editor.unmount()
    reopened.unmount()
  })
}

test('role editor sends the original revision and keeps server field errors visible', async () => {
  const h = setup(), { RoleEditorDialog } = h.load('features/roles/components/RoleEditorDialog.tsx')
  let tree = h.render(() => RoleEditorDialog({ role: custom, permissions, onClose() {}, onSaved() {} }))
  control(tree, 'Nombre del rol').props.onChange({ target: { value: 'Otro nombre' } }); tree = h.render()
  h.setHandler(async () => { throw { isAxiosError: true, response: { status: 422,
    data: { errors: { name: ['El nombre ya existe.'] } } } } })
  await form(tree).props.onSubmit({ preventDefault() {} }); tree = h.render()
  assert.deepEqual(h.calls[0], ['patch', '/admin/roles/10', { name: 'Otro nombre', permission_keys: ['rooms.view'], revision: 1 }])
  assert.match(textContent(tree), /El nombre ya existe/)
  assert.equal(field(tree, 'Nombre del rol').props.error, 'El nombre ya existe.')
  h.unmount()
})

test('base role editor is read-only and has no permission picker or mutation', async () => {
  const h = setup(), { RoleEditorDialog } = h.load('features/roles/components/RoleEditorDialog.tsx')
  const tree = h.render(() => RoleEditorDialog({ role: base, permissions, onClose() {}, onSaved() {} }))
  assert.equal(control(tree, 'Nombre del rol').props.disabled, true)
  assert.equal(nodes(tree, (node) => node.type?.name === 'PermissionPicker').length, 0)
  await form(tree).props.onSubmit({ preventDefault() {} })
  assert.equal(h.calls.length, 0)
  h.unmount()
})

test('permission picker uses functional module groups and distinguishes configuration from enablement', () => {
  const h = setup(), { PermissionPicker } = h.load('features/roles/components/PermissionPicker.tsx')
  let changed
  const tree = PermissionPicker({ permissions, selected: ['rooms.view'], disabled: false, onChange: (keys) => { changed = keys } })
  assert.match(textContent(tree), /Aulas/)
  const checks = nodes(tree, (node) => node.type?.name === 'Checkbox')
  assert.equal(checks.length, 3)
  assert.equal(checks[0].props.label, 'Consultar aulas')
  assert.match(textContent(checks[0].props.description), /Pendiente de habilitación/)
  checks[1].props.onChange({ target: { checked: true } })
  assert.deepEqual(changed, ['rooms.view', 'rooms.create'])
})

test('staff creation only offers active custom roles, sends no academic profile or password, and returns the actual account', async () => {
  const h = setup(), created = [], { CreateStaffAccountDialog } = h.load('features/users/components/CreateStaffAccountDialog.tsx')
  h.setHandler(async (method) => ({ data: { data: method === 'get'
    ? [base, custom, { ...custom, id: 11, status: 'INACTIVE' }] : account } }))
  h.render(() => CreateStaffAccountDialog({ onClose() {}, onCreated: (user) => created.push(user) })); await settle()
  let tree = h.render()
  const select = control(tree, 'Rol personalizado inicial')
  const options = nodes(select, (node) => node.type === 'option')
  assert.deepEqual(options.map((node) => node.props.value), ['', custom.id])
  for (const [label, value] of [['Nombres', 'Ana'], ['Apellidos', 'Rojas'], ['CI', '00987654'], ['Correo institucional', 'PERSONAL@UMSS.EDU.BO']]) {
    control(tree, label).props.onChange({ target: { value } })
  }
  select.props.onChange({ target: { value: '10' } }); tree = h.render()
  await form(tree).props.onSubmit({ preventDefault() {} })
  assert.deepEqual(h.calls.find(([method]) => method === 'post'), ['post', '/admin/users/staff', {
    first_names: 'Ana', last_names: 'Rojas', identity_number: '00987654', email: 'personal@umss.edu.bo', role_id: 10,
  }])
  assert.equal(created[0].teacher_id, null)
  assert.equal(created[0].student_id, null)
  h.unmount()
})

test('HU22 accepts custom names and keeps its existing assignment and withdrawal endpoints', async () => {
  const h = setup(), api = h.load('features/users/api/adminUsersApi.ts')
  h.setHandler(async (method) => ({ data: { data: method === 'get'
    ? [{ id: custom.id, name: custom.name, status: 'ACTIVE', assigned: false }]
    : method === 'delete' ? { ...account, roles: [] } : account } }))
  const [role] = await api.getUserRoles(account.id)
  await api.changeUserRole(account.id, role)
  await api.changeUserRole(account.id, { ...role, assigned: true })
  assert.deepEqual(h.calls[1], ['post', '/admin/users/30/roles', { role_id: custom.id }])
  assert.deepEqual(h.calls[2], ['delete', '/admin/users/30/roles/10'])
  h.unmount()
})

test('custom-only web entry preserves identity/logout and grants no administrative menus', async () => {
  const h = setup()
  h.auth.user = { id: 30, display_name: 'Ana Rojas', email: account.email, roles: [custom.name], permissions: [], must_change_password: false }
  const { getHomeRouteForUser } = h.load('features/auth/utils/authRoutes.ts')
  assert.equal(getHomeRouteForUser(h.auth.user), '/')
  for (const [roles, expected] of [[['ADMINISTRADOR'], '/'], [['DOCENTE'], '/docente'], [['ESTUDIANTE'], '/'], [['DOCENTE', 'ADMINISTRADOR'], '/']]) {
    assert.equal(getHomeRouteForUser({ ...h.auth.user, roles }), expected)
  }
  const { AppLayout } = h.load('layouts/AppLayout/AppLayout.tsx')
  const tree = h.render(() => { const content = AppLayout().props.children; return content.type(content.props) })
  const header = nodes(tree, (node) => node.type === 'Header')[0]
  assert.equal(header.props.user.name, 'Ana Rojas')
  assert.equal(header.props.user.role, 'staff')
  assert.equal(header.props.navigation.some((entry) => entry.to?.startsWith('/admin') || entry.children?.some((child) => child.to?.startsWith('/admin'))), false)
  await header.props.onLogout()
  assert.ok(h.calls.some(([action]) => action === 'logout'))
  h.unmount()
})

test('custom-only account cannot open a role-gated route and still follows mandatory first access', () => {
  const h = setup()
  h.auth.user = { id: 30, display_name: 'Ana', roles: [custom.name], permissions: [], must_change_password: false }
  const { ProtectedRoute } = h.load('features/auth/components/ProtectedRoute.tsx')
  let tree = h.render(() => ProtectedRoute({ allowedRoles: ['ADMINISTRADOR'] }))
  assert.equal(tree.props.to, '/')
  tree = h.render(() => ProtectedRoute({}))
  assert.equal(tree.type, 'Outlet')
  h.auth.user.must_change_password = true
  tree = h.render(() => ProtectedRoute({}))
  assert.equal(tree.props.to, '/cambiar-contrasena-inicial')
  h.unmount()
})

test('staff without operational permissions can stay at Home with identity and logout', () => {
  const h = setup()
  h.auth.user = { id: 30, display_name: 'Ana Rojas', email: account.email, roles: [custom.name], permissions: [] }
  const { AppLayout } = h.load('layouts/AppLayout/AppLayout.tsx')
  const tree = h.render(() => { const content = AppLayout().props.children; return content.type(content.props) })
  const header = nodes(tree, (node) => node.type === 'Header')[0]
  assert.equal(header.props.user.name, 'Ana Rojas')
  assert.equal(typeof header.props.onLogout, 'function')
  assert.ok(header.props.navigation.some((item) => item.to === '/'))
  assert.equal(header.props.navigation.some((item) => item.to === '/personal' || item.to?.startsWith('/admin')), false)
  h.unmount()
})
