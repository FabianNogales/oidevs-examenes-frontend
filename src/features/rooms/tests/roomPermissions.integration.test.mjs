import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

// Source integration tests with simulated hooks and transport, not browser tests.
const room = { id: 7, code: 'A-07', name: 'Aula siete', location: 'Bloque A', description: null,
  floor: 'PB', capacity: 30, status: 'ACTIVE', availability: 'AVAILABLE', current_exam: null }
const editable = Object.fromEntries(['id', 'code', 'name', 'location', 'description', 'floor', 'capacity']
  .map((key) => [key, room[key]]))
const response = { data: [room], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1, from: 1, to: 1 } }
const component = (tree, name) => nodes(tree, (node) => node.type?.name === name)[0]
const form = (tree) => nodes(tree, (node) => node.type === 'form')[0]

function setup(permissions = [], roles = ['Apoyo operativo']) {
  const calls = [], navigation = [], notices = []
  const auth = { user: { id: 12, display_name: 'Ana Rojas', roles, permissions,
    status: 'ACTIVE', must_change_password: false }, isAuthenticated: true, sessionError: null,
    isLoading: false, notify: (...args) => notices.push(args), logout: async () => {} }
  let handler = async (method, path, payload) => ({ data: method === 'get'
    ? path === '/admin/rooms' ? response : { data: path.endsWith('/edit') ? editable : room }
    : { data: { ...room, ...payload } } })
  const httpClient = Object.fromEntries(['get', 'post', 'put', 'patch'].map((method) => [method, (...args) => {
    calls.push([method, ...args])
    return handler(method, ...args)
  }]))
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient },
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '@/features/auth/hooks/useSessionRouteVerification': { useSessionRouteVerification: () => false },
    '@/layouts/AdminLayout/AdminLayout': { AdminLayout: 'AdminLayout' },
    'react-router': { Link: 'Link', Navigate: 'Navigate', Outlet: 'Outlet',
      useNavigate: () => (...args) => navigation.push(args), useParams: () => ({ roomId: '7' }),
      useLocation: () => ({ pathname: '/admin/rooms', search: '', state: null }) },
    '@/features/collaborations/components/CollaborationsProvider': { CollaborationsProvider: 'CollaborationsProvider' },
    '@/features/collaborations/hooks/useMyCollaborations': { useMyCollaborations: () => ({ collaborations: [] }) },
    '@/shared/components/Header/Header': { Header: 'Header' },
    '@/shared/components/Footer/Footer': { Footer: 'Footer' },
    '@/shared/components/Snackbar': { Snackbar: 'Snackbar' },
  })
  return Object.assign(h, { auth, calls, navigation, notices, setHandler: (next) => { handler = next } })
}

async function listing(h) {
  const { AdminRoomsPage } = h.load('features/rooms/pages/AdminRoomsPage.tsx')
  h.render(AdminRoomsPage)
  await settle()
  return h.render()
}

test('view-only reuses the listing and detail, with no create, edit, import or status actions', async () => {
  const h = setup(['rooms.view'])
  const { RoomWorkspacePage } = h.load('features/rooms/pages/RoomWorkspacePage.tsx')
  assert.equal(RoomWorkspacePage().type.name, 'AdminRoomsPage')
  const tree = await listing(h)
  const header = component(tree, 'PageHeader')
  assert.doesNotMatch(textContent(header.props.actions), /Registrar|Importar/)
  const table = component(tree, 'RoomsTable')
  assert.equal(table.props.onEdit, undefined)
  assert.equal(table.props.onStatusChange, undefined)
  const { RoomsTable } = h.load('features/rooms/components/RoomsTable.tsx')
  const dataTable = component(RoomsTable(table.props), 'DataTable')
  const actions = dataTable.props.columns.find((column) => column.id === 'actions').cell(room)
  assert.match(textContent(actions), /Ver detalle/)
  assert.doesNotMatch(textContent(actions), /Editar|Desactivar|Activar/)
  table.props.onDetail(room.id)
  const dialogProps = component(h.render(), 'RoomDialog').props
  assert.equal(dialogProps.canView, true)
  assert.equal(dialogProps.canEdit, false)
  const { RoomDetails } = h.load('features/rooms/components/RoomDetails.tsx')
  assert.doesNotMatch(textContent(RoomDetails({ room, onClose() {} })), /Editar aula/)
  assert.deepEqual(h.calls.map(([method, path]) => [method, path]), [['get', '/admin/rooms']])
  h.unmount()
})

test('view and create offer registration independently, without any edit or reserved actions', async () => {
  const h = setup(['rooms.view', 'rooms.create'])
  const tree = await listing(h)
  const actions = component(tree, 'PageHeader').props.actions
  assert.match(textContent(actions), /Registrar aula/)
  assert.doesNotMatch(textContent(actions), /Importar/)
  const table = component(tree, 'RoomsTable')
  assert.equal(table.props.onEdit, undefined)
  assert.equal(table.props.onStatusChange, undefined)
  nodes(actions, (node) => typeof node.props?.onClick === 'function')[0].props.onClick()
  const dialog = component(h.render(), 'RoomDialog')
  assert.equal(dialog.props.selection.mode, 'create')
  assert.equal(dialog.props.canCreate, true)
  assert.equal(dialog.props.canEdit, false)
  h.unmount()
})

test('view-only detail requests the existing consultation endpoint and offers no edit transition', async () => {
  const h = setup(['rooms.view'])
  const { RoomDialog } = h.load('features/rooms/components/RoomDialog.tsx')
  const render = () => {
    const dialog = RoomDialog({ selection: { mode: 'detail', roomId: 7 },
      canView: true, canCreate: false, canEdit: false, onClose() {}, onSaved() {} })
    const loader = component(dialog, 'ExistingRoom')
    return loader.type(loader.props)
  }
  h.render(render)
  await settle()
  const details = component(h.render(), 'RoomDetails')
  assert.deepEqual(details.props.room, room)
  assert.equal(details.props.onEdit, undefined)
  assert.deepEqual(h.calls.map(([method, path]) => [method, path]), [['get', '/admin/rooms/7']])
  h.unmount()
})

test('a forced edit or creation dialog without its permission mounts no form or loader', () => {
  for (const selection of [{ mode: 'create' }, { mode: 'edit', roomId: 7 }]) {
    const h = setup(['rooms.view'])
    const { RoomDialog } = h.load('features/rooms/components/RoomDialog.tsx')
    const tree = h.render(() => RoomDialog({ selection, canView: true, canCreate: false, canEdit: false,
      onClose() {}, onSaved() {} }))
    assert.match(textContent(tree), /No tienes permiso vigente/)
    assert.equal(component(tree, 'ExistingRoom'), undefined)
    assert.equal(component(tree, 'RoomForm'), undefined)
    assert.equal(h.calls.length, 0)
    h.unmount()
  }
})

test('create-only opens and submits the existing empty form without requesting the catalog or details', async () => {
  const h = setup(['rooms.create'])
  const { RoomWorkspacePage } = h.load('features/rooms/pages/RoomWorkspacePage.tsx')
  const entry = RoomWorkspacePage()
  assert.equal(entry.type.name, 'RoomWritePage')
  assert.equal(entry.props.mode, 'create')
  const page = h.render(() => entry.type(entry.props))
  const roomForm = component(page, 'RoomForm')
  assert.equal(roomForm.props.room, undefined)
  let tree = h.render(() => roomForm.type(roomForm.props))
  for (const [name, value] of [['code', 'NUEVA-01'], ['name', 'Nueva aula']]) {
    const input = nodes(tree, (node) => node.type?.name === 'RoomFormField' && node.props.field.name === name)[0]
    input.props.onChange(name, value)
  }
  tree = h.render()
  await form(tree).props.onSubmit({ preventDefault() {} })
  assert.deepEqual(h.calls, [['post', '/admin/rooms', { code: 'NUEVA-01', name: 'Nueva aula',
    location: null, description: null, floor: null, capacity: null }]])
  assert.equal(h.navigation.at(-1)[0], '/')
  assert.match(h.notices[0][1], /registrada correctamente/)
  h.unmount()
})

test('edit-only loads just the target form dependency and never requests consultation', async () => {
  const h = setup(['rooms.update'])
  const { RoomWorkspacePage } = h.load('features/rooms/pages/RoomWorkspacePage.tsx')
  assert.equal(component(RoomWorkspacePage(), 'AdminRoomsPage'), undefined)
  assert.match(textContent(RoomWorkspacePage()), /no incluye consultar el listado/)
  const { RoomWritePage } = h.load('features/rooms/pages/RoomWritePage.tsx')
  const page = RoomWritePage({ mode: 'edit' })
  const dialog = component(page, 'RoomDialog')
  assert.equal(dialog.props.canView, false)
  const render = () => {
    const modal = dialog.type(dialog.props)
    const loader = component(modal, 'ExistingRoom')
    return loader.type(loader.props)
  }
  h.render(render)
  await settle()
  const roomForm = component(h.render(), 'RoomForm')
  assert.deepEqual(roomForm.props.room, editable)
  assert.equal('status' in roomForm.props.room, false)
  assert.equal('current_exam' in roomForm.props.room, false)
  assert.deepEqual(h.calls.map(([method, path]) => [method, path]), [['get', '/admin/rooms/7/edit']])
  h.unmount()
})

test('direct room routes evaluate each permission independently and do not widen the admin panel', () => {
  const h = setup(['rooms.create'])
  const { RoomRoute } = h.load('features/rooms/components/RoomRoute.tsx')
  assert.equal(RoomRoute({}).type, 'Outlet')
  assert.equal(RoomRoute({ operation: 'create' }).type, 'Outlet')
  assert.equal(RoomRoute({ operation: 'update' }).type, 'Navigate')
  const { ProtectedRoute } = h.load('features/auth/components/ProtectedRoute.tsx')
  assert.equal(h.render(() => ProtectedRoute({ allowedRoles: ['ADMINISTRADOR'] })).props.to, '/')
  h.auth.user.must_change_password = true
  assert.equal(h.render(() => ProtectedRoute({})).props.to, '/cambiar-contrasena-inicial')
  assert.equal(RoomRoute({ operation: 'create' }).type, 'Navigate')
  h.unmount()
})

test('no permission and withdrawn permission remove staff links and reject direct routes', () => {
  const h = setup(['rooms.view'])
  const { getDelegatedNavigation } = h.load('features/roles/utils/delegatedNavigation.ts')
  const { RoomRoute } = h.load('features/rooms/components/RoomRoute.tsx')
  assert.deepEqual(getDelegatedNavigation(h.auth.user).map((item) => item.to), ['/admin/rooms'])
  h.auth.user.permissions = []
  assert.deepEqual(getDelegatedNavigation(h.auth.user), [])
  assert.equal(RoomRoute({}).props.to, '/')
  assert.equal(RoomRoute({ operation: 'create' }).type, 'Navigate')
  assert.equal(RoomRoute({ operation: 'update' }).type, 'Navigate')
  assert.equal(h.calls.length, 0)
})

test('staff header links directly to creation without a consultation link', () => {
  const h = setup(['rooms.create'])
  const { AppLayout } = h.load('layouts/AppLayout/AppLayout.tsx')
  const content = nodes(AppLayout(), (node) => node.type?.name === 'AppLayoutContent')[0]
  const tree = h.render(() => content.type(content.props))
  const header = nodes(tree, (node) => node.type === 'Header')[0]
  assert.equal(header.props.user.role, 'staff')
  assert.ok(header.props.navigation.some((item) => item.to === '/admin/rooms/create'))
  assert.equal(header.props.navigation.some((item) => item.to === '/admin/rooms'), false)
  assert.equal(header.props.navigation.some((item) => item.to === '/personal'), false)
  h.unmount()
})

test('all delegated room permissions still hide import and status actions', async () => {
  const h = setup(['rooms.view', 'rooms.create', 'rooms.update'])
  const tree = await listing(h)
  assert.doesNotMatch(textContent(component(tree, 'PageHeader').props.actions), /Importar/)
  const table = component(tree, 'RoomsTable')
  assert.equal(typeof table.props.onEdit, 'function')
  assert.equal(table.props.onStatusChange, undefined)
  h.unmount()
})

test('administrator retains the original layout, create, edit, CSV and state actions without permission keys', async () => {
  const h = setup([], ['ADMINISTRADOR'])
  const { RoomRoute } = h.load('features/rooms/components/RoomRoute.tsx')
  assert.equal(RoomRoute({}).type, 'AdminLayout')
  assert.equal(RoomRoute({ operation: 'update' }).type, 'AdminLayout')
  const tree = await listing(h)
  const actions = component(tree, 'PageHeader').props.actions
  assert.match(textContent(actions), /Registrar aula/)
  assert.ok(nodes(actions, (node) => node.props?.to === '/admin/rooms/import').length)
  const table = component(tree, 'RoomsTable')
  assert.equal(typeof table.props.onEdit, 'function')
  assert.equal(typeof table.props.onStatusChange, 'function')
  const { RoomsTable } = h.load('features/rooms/components/RoomsTable.tsx')
  const row = component(RoomsTable(table.props), 'DataTable').props.columns.find((column) => column.id === 'actions').cell(room)
  assert.match(textContent(row), /Editar/)
  assert.match(textContent(row), /Desactivar/)
  h.unmount()
})

test('room access uses the union of effective permissions and never infers consultation from writes', () => {
  const h = setup(['rooms.create'], ['Apoyo uno', 'Apoyo dos'])
  const { getRoomAccess } = h.load('features/rooms/utils/roomAccess.ts')
  assert.deepEqual(getRoomAccess(h.auth.user), { isAdministrator: false, canView: false,
    canCreate: true, canEdit: false, canAccess: true })
  h.auth.user.permissions.push('rooms.update')
  assert.equal(getRoomAccess(h.auth.user).canView, false)
  h.auth.user.status = 'INACTIVE'
  assert.equal(getRoomAccess(h.auth.user).canAccess, false)
  assert.equal(getRoomAccess(null).canAccess, false)
})

test('Roles shows enabled existing Aulas keys, without a pending Block 2 label or other modules', () => {
  const h = setup()
  const { PermissionPicker } = h.load('features/roles/components/PermissionPicker.tsx')
  const permissions = ['view', 'create', 'update'].map((action) => ({ key: `rooms.${action}`, module: 'Aulas',
    label: action, description: 'Acción de Aulas', is_configurable: true, is_enabled: true }))
  const tree = PermissionPicker({ permissions, selected: [], disabled: false, onChange() {} })
  const checks = nodes(tree, (node) => node.type?.name === 'Checkbox')
  assert.equal(checks.length, 3)
  for (const check of checks) {
    assert.match(textContent(check.props.description), /Habilitado para uso/)
    assert.doesNotMatch(textContent(check.props.description), /Pendiente|Bloque 2/)
  }
})
