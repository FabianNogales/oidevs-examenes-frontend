import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

const meta = (total = 1, page = 1) => ({ current_page: page, last_page: Math.max(1, Math.ceil(total / 10)), total, from: total ? 1 : null, to: total ? 1 : null })
const career = { id: 2, code: 'SIS', name: 'Sistemas', status: 'INACTIVE' }
const audit = { id: 5, actor_id: null, action: 'CREATE', entity_type: 'Exam', entity_id: 3,
  created_at: '2026-10-20T12:00:00.000000Z', old_context: [], new_context: { course_offering_id: 7 } }
const student = { id: 8, sis_code: '000123', first_names: 'Ana', last_names: 'Ejemplo', email: 'ana@umss.edu.bo', status: 'ACTIVE' }
const failed = (status, data = {}) => ({ isAxiosError: true, response: { status, data } })

function harness() {
  let get = async () => ({ data: { data: [career], meta: meta() } })
  let post = async () => ({ data: { data: student } })
  let catalog = async () => [career]
  const calls = []
  const h = sourceHarness({ '@/shared/api/httpClient': { httpClient: {
    get: (...args) => { calls.push(['get', ...args]); return get(...args) },
    post: (...args) => { calls.push(['post', ...args]); return post(...args) },
  } }, '@/features/subjects/api/adminSubjectsApi': { getSubjectCareers: (...args) => catalog(...args) },
    'react-router': { NavLink: 'link', useLocation: () => ({ pathname: h.pathname }) },
    '@/features/admin/api/adminUsersMock': { getAdminUsersMock: async () => { calls.push(['mock']); return { users: [], meta: meta(0) } } },
  })
  h.pathname = '/admin/users/manage'
  return Object.assign(h, { calls, setGet: (value) => { get = value }, setPost: (value) => { post = value }, setCatalog: (value) => { catalog = value } })
}
const input = (tree, id) => nodes(tree, (node) => node.props?.id?.endsWith(id))[0]
const table = (tree) => nodes(tree, (node) => node.props?.viewActionLabel === 'Ver detalle' || node.props?.entityLabel === 'estudiantes')[0]
function fill(h, render) {
  let tree = h.render(render)
  for (const [field, value] of Object.entries({ institutional_code: ' 000123 ', identity_number: '00123456',
    first_names: ' Ana ', last_names: ' Ejemplo ', email: ' ANA@UMSS.EDU.BO ' })) {
    input(tree, field).props.onChange({ target: { value } }); tree = h.render()
  }
  input(tree, '-career').props.onChange({ target: { value: '2' } })
  return h.render()
}
const submit = (tree) => nodes(tree, (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} })

test('028: manual creation uses actual API mapping, preserves leading zeros, accepts inactive career and prevents double submission', async () => {
  const h = harness()
  const { CreateStudentModal } = h.load('features/admin/components/CreateStudentModal.tsx')
  let created
  const render = () => CreateStudentModal({ onClose() {}, onCreated: (value) => { created = value } })
  h.render(render); await settle()
  let finish
  h.setPost(() => new Promise((resolve) => { finish = resolve }))
  const tree = fill(h, render)
  const option = nodes(tree, (node) => node.type === 'option' && node.props.value === 2)[0]
  assert.match(textContent(option), /Inactiva/); assert.ok(!option.props.disabled)
  submit(tree); submit(tree)
  assert.equal(h.calls.filter((call) => call[0] === 'post').length, 1)
  const payload = h.calls[0][2]
  assert.equal(h.calls[0][1], '/admin/students')
  assert.equal(payload.sis_code, '000123'); assert.equal(payload.identity_number, '00123456')
  assert.equal(payload.email, 'ana@umss.edu.bo'); assert.equal(payload.career_id, '2')
  assert.ok(!('password' in payload)); assert.ok(!('profile_photo' in payload))
  assert.equal(h.render().props.busy, true)
  finish({ data: { data: student } }); await settle()
  assert.equal(created.id, '8'); assert.equal(created.institutional_code, '000123')
  h.unmount()
})

for (const status of [422, 409]) test(`028: HTTP ${status} preserves the draft and displays field/conflict errors without reporting success`, async () => {
  const h = harness()
  h.setPost(async () => { throw failed(status, { message: 'Datos duplicados.', errors: { sis_code: ['El SIS ya existe.'] } }) })
  const { CreateStudentModal } = h.load('features/admin/components/CreateStudentModal.tsx')
  let created = 0
  const render = () => CreateStudentModal({ onClose() {}, onCreated: () => created++ })
  h.render(render); await settle(); submit(fill(h, render)); await settle()
  const tree = h.render()
  assert.equal(created, 0); assert.match(textContent(tree), /Datos duplicados/)
  assert.equal(input(tree, 'institutional_code').props['aria-invalid'], true)
  assert.equal(input(tree, 'identity_number').props.value, '00123456')
  assert.equal(tree.props.busy, false); h.unmount()
})

test('028: catalog failure blocks submission and can retry without filtering inactive careers', async () => {
  const h = harness()
  h.setCatalog(async () => { throw new Error('unavailable') })
  const { CreateStudentModal } = h.load('features/admin/components/CreateStudentModal.tsx')
  h.render(() => CreateStudentModal({ onClose() {}, onCreated() {} })); await settle()
  let tree = h.render(); submit(tree)
  assert.equal(h.calls.length, 0)
  assert.match(textContent(tree), /No se pudo cargar el catálogo/)
  h.setCatalog(async () => [career])
  nodes(tree, (node) => node.type === 'button' && textContent(node) === 'Reintentar')[0].props.onClick()
  h.render(); await settle(); tree = h.render()
  assert.ok(nodes(tree, (node) => node.type === 'option' && node.props.value === career.id).length)
  h.unmount()
})

test('028: successful creation closes the modal and refreshes the real student list', async () => {
  const h = harness()
  h.setGet(async () => ({ data: { data: [student], meta: meta() } }))
  const { AdminManageStudentsPage } = h.load('features/admin/pages/AdminManageStudentsPage.tsx')
  let tree = h.render(AdminManageStudentsPage); await settle(); tree = h.render()
  nodes(tree, (node) => node.type === 'button' && textContent(node).includes('Registrar estudiante'))[0].props.onClick()
  tree = h.render()
  const modal = nodes(tree, (node) => typeof node.props?.onCreated === 'function')[0]
  assert.ok(modal)
  const before = h.calls.length
  modal.props.onCreated(student); await settle(); tree = h.render()
  assert.equal(h.calls.length, before + 1)
  assert.match(textContent(tree), /Estudiante registrado correctamente/)
  assert.equal(nodes(tree, (node) => typeof node.props?.onCreated === 'function').length, 0)
  assert.equal(table(tree).props.data.length, 1)
  h.unmount()
})

for (const kind of ['careers', 'audit-logs']) test(`024/022: ${kind} uses real pagination and fetches detail from the exact ID`, async () => {
  const h = harness(); const row = kind === 'careers' ? career : audit
  h.setGet(async (path) => ({ data: path.endsWith('/' + row.id) ? { data: row } : { data: [row], meta: meta(11) } }))
  const { AdminReadPage } = h.load('features/admin/pages/AdminReadPage.tsx')
  const render = () => { const node = AdminReadPage({ kind }); return node.type(node.props) }
  h.render(render); await settle(); let tree = h.render()
  assert.equal(table(tree).props.loading, false)
  assert.equal(h.calls[0][1], '/admin/' + kind)
  assert.equal(Boolean(table(tree).props.onSearch), kind === 'careers')
  table(tree).props.onPageChange(2); h.render(); await settle(); tree = h.render()
  assert.equal(h.calls.at(-1)[2].params.page, 2)
  table(tree).props.onViewProfile(row); await settle(); tree = h.render()
  assert.equal(h.calls.at(-1)[1], `/admin/${kind}/${row.id}`)
  assert.match(textContent(tree), kind === 'careers' ? /Sistemas/ : /Contexto nuevo permitido/)
  if (kind === 'audit-logs') assert.match(textContent(tree), /total cuenta eventos/)
  h.unmount()
})

test('022: search resets page and preserves a real inactive career as read-only', async () => {
  const h = harness()
  const { AdminReadPage } = h.load('features/admin/pages/AdminReadPage.tsx')
  h.render(() => { const node = AdminReadPage({ kind: 'careers' }); return node.type(node.props) }); await settle()
  let tree = h.render(); table(tree).props.onSearch(' SIS '); h.render(); await settle(); tree = h.render()
  assert.equal(h.calls.at(-1)[2].params.search, 'SIS')
  assert.equal(h.calls.at(-1)[2].params.page, 1)
  assert.equal(table(tree).props.onToggleStatus, undefined)
  assert.equal(table(tree).props.data[0].status, 'INACTIVE'); h.unmount()
})

test('024: empty, failed and retried list states remain distinct', async () => {
  const h = harness()
  h.setGet(async () => { throw failed(403) })
  const { AdminReadPage } = h.load('features/admin/pages/AdminReadPage.tsx')
  h.render(() => { const node = AdminReadPage({ kind: 'audit-logs' }); return node.type(node.props) })
  await settle(); let tree = h.render()
  assert.ok(table(tree).props.error); assert.equal(table(tree).props.data.length, 0)
  h.setGet(async () => ({ data: { data: [], meta: meta(0) } }))
  table(tree).props.onRetry(); h.render(); await settle(); tree = h.render()
  assert.equal(table(tree).props.error, null); assert.equal(table(tree).props.loading, false)
  assert.equal(table(tree).props.data.length, 0); h.unmount()
})

test('024: closing detail aborts its request and ignores late completion', async () => {
  const h = harness()
  let finish
  h.setGet(async (path) => path.endsWith('/5') ? new Promise((resolve) => { finish = resolve }) : { data: { data: [audit], meta: meta() } })
  const { AdminReadPage } = h.load('features/admin/pages/AdminReadPage.tsx')
  h.render(() => { const node = AdminReadPage({ kind: 'audit-logs' }); return node.type(node.props) }); await settle()
  table(h.render()).props.onViewProfile(audit)
  let tree = h.render()
  nodes(tree, (node) => node.props?.title === 'Detalle del registro')[0].props.onClose()
  assert.ok(h.calls.at(-1)[2].signal.aborted)
  finish({ data: { data: audit } }); await settle(); tree = h.render()
  assert.equal(nodes(tree, (node) => node.props?.title === 'Detalle del registro').length, 0); h.unmount()
})

for (const status of [401, 403, 404, 500]) test(`024: HTTP ${status} returns a safe error without raw backend content`, async () => {
  const h = harness(); h.setGet(async () => { throw failed(status, { message: 'private-marker' }) })
  const api = h.load('features/admin/api/adminReadApi.ts')
  await assert.rejects(() => api.readAuditEvent(5, new AbortController().signal), (error) => !error.message.includes('private-marker'))
})

test('024: malformed pagination and mismatched detail identity are rejected', async () => {
  const h = harness(); const api = h.load('features/admin/api/adminReadApi.ts')
  h.setGet(async () => ({ data: { data: [audit], meta: { ...meta(), total: '1' } } }))
  await assert.rejects(() => api.listAuditEvents({ page: 1, search: '' }, new AbortController().signal))
  h.setGet(async () => ({ data: { data: { ...audit, id: 99 } } }))
  await assert.rejects(() => api.readAuditEvent(5, new AbortController().signal))
})

test('020: mock users are explicitly labeled and expose no fictitious mutations or profile links', async () => {
  const h = harness()
  const { AdminManageUsersPage } = h.load('features/admin/pages/AdminManageUsersPage.tsx')
  h.render(AdminManageUsersPage); await settle(); const tree = h.render()
  assert.match(textContent(tree), /demostración con datos simulados/)
  const grid = nodes(tree, (node) => node.props?.entityLabel === 'usuarios')[0]
  assert.equal(grid.props.onToggleStatus, undefined); assert.equal(grid.props.getProfilePath, undefined)
  assert.equal(nodes(tree, (node) => node.props?.onConfirm).length, 0); h.unmount()
})

test('020: pending role history never pretends that a mock user list is a real history', async () => {
  const h = harness(); h.pathname = '/admin/users/history'
  const { AdminManageUsersPage } = h.load('features/admin/pages/AdminManageUsersPage.tsx')
  h.render(AdminManageUsersPage); await settle(); const tree = h.render()
  assert.match(textContent(tree), /historial real de usuarios y roles está pendiente/)
  assert.equal(h.calls.length, 0)
  assert.equal(nodes(tree, (node) => node.props?.entityLabel === 'usuarios').length, 0); h.unmount()
})

test('024/022: new navigation links belong only to the administrator menu', () => {
  const h = harness(); const { navigationByRole } = h.load('shared/components/Header/headerNavigation.config.ts')
  for (const path of ['/admin/careers', '/admin/audit-logs']) {
    assert.ok(navigationByRole.admin.some((item) => item.to === path))
    assert.ok(![...navigationByRole.teacher, ...navigationByRole.student].some((item) => item.to === path))
  }
})

test('shared table: Ver detalle is optional and Ver perfil remains the default for existing consumers', () => {
  const h = sourceHarness({ 'react-router': { useNavigate: () => () => {} } })
  const { DataTableRow } = h.load('shared/components/DataTable/DataTableRow.tsx')
  for (const [label, expected] of [[undefined, 'Ver perfil'], ['Ver detalle', 'Ver detalle']]) {
    const tree = h.render(() => DataTableRow({ item: { id: 1 }, columns: [], onViewProfile() {}, viewActionLabel: label }))
    assert.equal(textContent(nodes(tree, (node) => node.type === 'button')[0]), expected)
  }
})
