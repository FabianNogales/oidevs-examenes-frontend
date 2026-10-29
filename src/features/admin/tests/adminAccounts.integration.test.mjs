import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { sourceHarness, sourceRoot, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

const account = { id: 15, first_names: 'Persona', last_names: 'Real', full_name: 'Persona Real', email: 'real@umss.edu.bo',
  institutional_code: 'DOC-15', identity_number: '12345678', status: 'ACTIVE', roles: [{ id: 2, name: 'DOCENTE' }],
  student_id: 70, teacher_id: 30, student_status: 'INACTIVE', teacher_status: 'ACTIVE' }
const meta = (total = 1, page = 1) => ({ current_page: page, last_page: Math.max(1, Math.ceil(total / 10)), total, from: total ? 1 : null, to: total ? total : null })
const failure = (status) => ({ isAxiosError: true, response: { status, data: { message: 'Condición rechazada.' } } })
function harness() {
  const calls = [], notices = []
  let handler = async (method, path) => method === 'get' && path === '/admin/users' ? { data: { data: [account], meta: meta() } }
    : method === 'get' && path.endsWith('/roles') ? { data: { data: [{ id: 2, name: 'DOCENTE', status: 'ACTIVE', assigned: true }] } }
      : { data: { data: account } }
  const auth = { user: { id: 1 }, notify: (...args) => notices.push(args), clearSession: () => calls.push(['clearSession']) }
  const httpClient = Object.fromEntries(['get', 'patch', 'post', 'delete'].map((method) => [method, (...args) => { calls.push([method, ...args]); return handler(method, ...args) }]))
  const h = sourceHarness({ '@/shared/api/httpClient': { httpClient }, '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    'react-router': { Link: 'link', useParams: () => ({ userId: String(h.userId ?? 15) }), useLocation: () => ({ pathname: '/admin/users/manage' }) },
    '@/features/admin/api/adminUsersMock': { getAdminUsersMock() { throw new Error('Operational mock forbidden') } },
  })
  return Object.assign(h, { calls, notices, auth, setHandler: (value) => { handler = value } })
}
const table = (tree, label = 'usuarios') => nodes(tree, (node) => node.props?.entityLabel === label)[0]
const confirm = (tree) => nodes(tree, (node) => node.props?.isOpen && node.props?.onConfirm)[0]

test('HU21 loads actual IDs, searches on the API, paginates and preserves distinct profile IDs', async () => {
  const h = harness(), { ManageAccounts } = h.load('features/admin/pages/AdminManageUsersPage.tsx')
  h.render(ManageAccounts); await settle(); let tree = h.render()
  assert.equal(table(tree).props.data[0].id, 15)
  assert.equal(table(tree).props.data[0].role_label, 'Docente')
  assert.doesNotMatch(textContent(tree), /datos simulados/)
  table(tree).props.onSearch('Real'); h.render(); await settle(); tree = h.render()
  assert.equal(h.calls.at(-1)[2].params.search, 'Real'); assert.equal(h.calls.at(-1)[2].params.page, 1)
  table(tree).props.onPageChange(2); h.render(); await settle(); tree = h.render()
  assert.equal(h.calls.at(-1)[2].params.page, 2)
  table(tree).props.onViewProfile(table(tree).props.data[0]); await settle(); tree = h.render()
  const links = nodes(tree, (node) => node.type === 'link').map((node) => node.props.to)
  assert.ok(links.includes('/admin/teachers/30')); assert.ok(links.includes('/admin/students/70'))
  assert.ok(links.includes('/admin/users/15/roles')); h.unmount()
})

test('HU21 confirms once, persists global status, reloads the real filtered list and reports success', async () => {
  const h = harness(), { ManageAccounts } = h.load('features/admin/pages/AdminManageUsersPage.tsx')
  h.render(ManageAccounts); await settle(); let tree = h.render()
  table(tree).props.onToggleStatus(table(tree).props.data[0]); tree = h.render()
  let finish
  h.setHandler((method) => method === 'patch' ? new Promise((resolve) => { finish = resolve }) : Promise.resolve({ data: { data: [{ ...account, status: 'INACTIVE' }], meta: meta() } }))
  const first = confirm(tree).props.onConfirm(); confirm(tree).props.onConfirm()
  assert.equal(h.calls.filter(([method]) => method === 'patch').length, 1)
  const patch = h.calls.find(([method]) => method === 'patch')
  assert.deepEqual(patch.slice(1), ['/admin/users/15/status', { status: 'INACTIVE' }])
  finish({ data: { data: { ...account, status: 'INACTIVE' } } }); await first; await settle(); tree = h.render()
  assert.equal(table(tree).props.data[0].status, 'INACTIVE'); assert.equal(h.notices[0][0], 'success'); h.unmount()
})

test('HU21 blocks self deactivation in the UI without pretending to mutate', async () => {
  const h = harness(); h.auth.user.id = 15
  const { ManageAccounts } = h.load('features/admin/pages/AdminManageUsersPage.tsx')
  h.render(ManageAccounts); await settle(); const tree = h.render()
  table(tree).props.onToggleStatus(table(tree).props.data[0])
  assert.equal(h.notices[0][0], 'error'); assert.equal(confirm(h.render()), undefined); h.unmount()
})

for (const status of [401, 403, 404, 409, 422]) test(`HU21 preserves state and exposes HTTP ${status} without a false success`, async () => {
  const h = harness(), { ManageAccounts } = h.load('features/admin/pages/AdminManageUsersPage.tsx')
  h.render(ManageAccounts); await settle(); let tree = h.render()
  table(tree).props.onToggleStatus(table(tree).props.data[0]); tree = h.render()
  h.setHandler(async () => { throw failure(status) }); await confirm(tree).props.onConfirm(); tree = h.render()
  assert.equal(table(tree).props.data[0].status, 'ACTIVE'); assert.ok(table(tree).props.error)
  assert.equal(h.notices.length, 0); h.unmount()
})

test('HU22 uses its own grant/revoke endpoints, reloads roles, and does not mutate account availability', async () => {
  const h = harness(), api = h.load('features/admin/api/adminUsersApi.ts')
  h.setHandler(async () => ({ data: { data: { ...account, roles: [] } } }))
  await api.changeUserRole(15, { id: 2, name: 'DOCENTE', status: 'ACTIVE', assigned: true })
  assert.equal(h.calls[0][1], '/admin/users/15/roles/2'); assert.equal(h.calls[0][0], 'delete')
  h.setHandler(async () => ({ data: { data: account } }))
  await api.changeUserRole(15, { id: 2, name: 'DOCENTE', status: 'ACTIVE', assigned: false })
  assert.deepEqual(h.calls[1], ['post', '/admin/users/15/roles', { role_id: 2 }]); h.unmount()
})

test('HU22 confirms removal against the real API and refreshes its assignment', async () => {
  const h = harness(), { AdminUserRolesPage } = h.load('features/admin/pages/AdminUserRolesPage.tsx')
  h.render(AdminUserRolesPage); await settle(); let tree = h.render()
  const grid = table(tree, 'roles'); assert.equal(grid.props.data[0].assigned, true)
  const action = grid.props.columns.find((column) => column.id === 'actions').cell(grid.props.data[0])
  action.props.onClick(); tree = h.render()
  h.setHandler(async (method, path) => method === 'delete' ? { data: { data: { ...account, roles: [] } } }
    : path.endsWith('/roles') ? { data: { data: [{ id: 2, name: 'DOCENTE', status: 'ACTIVE', assigned: false }] } } : { data: { data: account } })
  confirm(tree).props.onConfirm(); await settle(); h.render(); await settle(); tree = h.render()
  assert.equal(table(tree, 'roles').props.data[0].assigned, false); assert.equal(h.notices[0][0], 'success'); h.unmount()
})

test('account history consumes persisted events, supports real paging and has an honest empty state', async () => {
  const h = harness(); h.setHandler(async () => ({ data: { data: [], meta: meta(0) } }))
  const { AdminUserHistoryPage } = h.load('features/admin/pages/AdminUserHistoryPage.tsx')
  h.render(AdminUserHistoryPage); await settle(); let tree = h.render()
  assert.equal(h.calls[0][1], '/admin/users/history'); assert.equal(table(tree, 'eventos').props.data.length, 0)
  assert.match(textContent(tree), /No se reconstruyen/)
  table(tree, 'eventos').props.onSearch('15'); h.render(); await settle()
  assert.equal(h.calls.at(-1)[2].params.search, '15'); h.unmount()
})

test('HU22 hides stale account roles and confirmations while navigating to another account', async () => {
  const h = harness(), { AdminUserRolesPage } = h.load('features/admin/pages/AdminUserRolesPage.tsx')
  h.render(AdminUserRolesPage); await settle(); let tree = h.render()
  const grid = table(tree, 'roles')
  grid.props.columns.find((column) => column.id === 'actions').cell(grid.props.data[0]).props.onClick()
  assert.ok(confirm(h.render()))
  h.userId = 16
  h.setHandler(() => new Promise(() => {}))
  tree = h.render()
  assert.equal(table(tree, 'roles').props.data.length, 0)
  assert.equal(table(tree, 'roles').props.loading, true)
  assert.equal(confirm(tree), undefined)
  h.unmount()
})

test('HU22 clears the current session after a permitted change of its own secondary role', async () => {
  const h = harness(); h.auth.user.id = 15
  const { AdminUserRolesPage } = h.load('features/admin/pages/AdminUserRolesPage.tsx')
  h.render(AdminUserRolesPage); await settle(); let tree = h.render()
  const grid = table(tree, 'roles')
  grid.props.columns.find((column) => column.id === 'actions').cell(grid.props.data[0]).props.onClick(); tree = h.render()
  h.setHandler(async () => ({ data: { data: { ...account, roles: [] } } }))
  confirm(tree).props.onConfirm(); await settle()
  assert.ok(h.calls.some(([method]) => method === 'clearSession')); h.unmount()
})

test('all profile tabs call the real profile-ID endpoint, use server pagination and contain no demo records', async () => {
  const cases = [['StudentCurrentSubjectsTab','students','subjects'],['StudentSubjectHistoryTab','students','subject-history'],
    ['TeacherActiveSubjectsTab','teachers','subjects'],['TeacherSubjectHistoryTab','teachers','subject-history'],
    ['TeacherActiveExamsTab','teachers','exams'],['TeacherExamHistoryTab','teachers','exam-history'],
    ['CollaboratorRoleTab','students','collaborations'],['RoleHistoryTab','students','roles']]
  for (const [name, type, section] of cases) {
    const h = harness(); h.setHandler(async () => ({ data: { data: [], meta: meta(0), summary: section === 'collaborations' ? { active: 0, completed: 0 } : null } }))
    const component = h.load(`features/admin/profile/tabs/${name}.tsx`)[name]
    h.render(() => component({ entity: { id: 70, role: type === 'teachers' ? 'TEACHER' : 'STUDENT', first_names: 'Persona', last_names: 'Real' } }))
    await settle(); const tree = h.render(), grid = nodes(tree, (node) => node.props?.fields && node.props?.onPageChange)[0]
    assert.equal(h.calls[0][1], `/admin/profiles/${type}/70/records`); assert.equal(h.calls[0][2].params.section, section)
    assert.equal(grid.props.data.length, 0); assert.equal(grid.props.loading, false)
    assert.doesNotMatch(readFileSync(`${sourceRoot}features/admin/profile/tabs/${name}.tsx`, 'utf8'), /MOCK_/)
    grid.props.onPageChange(2); h.render(); await settle(); assert.equal(h.calls.at(-1)[2].params.page, 2); h.unmount()
  }
})

test('malformed accounts and mismatched IDs fail closed', async () => {
  const h = harness(), api = h.load('features/admin/api/adminUsersApi.ts')
  h.setHandler(async () => ({ data: { data: { ...account, id: 99 } } }))
  await assert.rejects(api.getAdminUser(15), /no corresponde/)
  h.setHandler(async () => ({ data: { data: [{ ...account, id: 'fake' }], meta: meta() } }))
  await assert.rejects(api.getAdminUsers(), /cuenta no válida/); h.unmount()
})

test('HU22 keeps navigation for all server-authorized permanent roles without granting collaboration', () => {
  const h = harness(), { getHeaderNavigation } = h.load('shared/components/Header/headerNavigation.config.ts')
  const multi = getHeaderNavigation('admin', false, ['admin', 'teacher', 'student'])
  const paths = multi.flatMap((item) => [item.to, ...(item.children ?? []).map((child) => child.to)])
    .filter(Boolean).map((path) => path.split('?')[0])
  for (const path of ['/admin/teachers', '/teacher/subjects', '/teacher/exams', '/students/profile', '/students/qr'])
    assert.ok(paths.includes(path))
  // Teacher enrollments are reached from each subject, not a separate header entry.
  assert.ok(!paths.includes('/teacher/students'))
  assert.equal(multi.filter((item) => item.to === '/').length, 1)
  assert.ok(!multi.some((item) => item.to === '/collaborator'))
  assert.ok(!getHeaderNavigation('student', false, ['student']).some((item) => item.to?.startsWith('/admin')))
  h.unmount()
})

test('HU22 account selection cannot change availability through HU21 operations', async () => {
  const h = harness(), { ManageAccounts } = h.load('features/admin/pages/AdminManageUsersPage.tsx')
  h.render(() => ManageAccounts({ rolesView: true })); await settle(); const tree = h.render(), grid = table(tree)
  assert.equal(grid.props.getProfilePath(grid.props.data[0]), '/admin/users/15/roles')
  assert.equal(grid.props.onToggleStatus, undefined); h.unmount()
})

for (const status of [403, 409, 422]) test(`HU22 keeps assignments unchanged after HTTP ${status}`, async () => {
  const h = harness(), { AdminUserRolesPage } = h.load('features/admin/pages/AdminUserRolesPage.tsx')
  h.render(AdminUserRolesPage); await settle(); let tree = h.render()
  const grid = table(tree, 'roles')
  grid.props.columns.find((column) => column.id === 'actions').cell(grid.props.data[0]).props.onClick(); tree = h.render()
  h.setHandler(async () => { throw failure(status) }); confirm(tree).props.onConfirm(); await settle(); tree = h.render()
  assert.ok(table(tree, 'roles').props.error); assert.equal(table(tree, 'roles').props.data[0].assigned, true)
  assert.equal(h.notices.length, 0); h.unmount()
})

test('reconciliation preserves result badge styles without treating missing data as a failure', () => {
  const h = harness(), { AcademicResultBadge } = h.load('features/admin/profile/components/AcademicResultBadge.tsx')
  for (const [result, label, style] of [['APPROVED', 'Aprobado', 'statusActive'], ['FAILED', 'Reprobado', 'statusInactive']]) {
    const tree = h.render(() => AcademicResultBadge({ result }))
    assert.equal(textContent(tree), label)
    assert.ok(tree.props.className.includes(style))
  }
  for (const result of ['NOT_RECORDED', null, 'UNKNOWN']) {
    const tree = h.render(() => AcademicResultBadge({ result }))
    assert.match(textContent(tree), /Información no disponible/)
    assert.doesNotMatch(textContent(tree), /Aprobado|Reprobado/)
    assert.equal(tree.props.className, undefined)
  }
  h.unmount()
})

test('profile period badge uses the existing HU24 endpoint and preserves the supplied classes', async () => {
  const h = harness()
  h.setHandler(async () => ({ data: { data: { id: 31, name: 'Período de prueba', start_date: '2028-01-01', end_date: '2028-06-30', status: 'ACTIVE' } } }))
  const { ProfileActiveTermBadge } = h.load('features/admin/profile/components/ProfileActiveTermBadge.tsx')
  let tree = h.render(() => ProfileActiveTermBadge({ className: 'termBadge', label: 'Gestión activa' }))
  assert.match(textContent(tree), /Consultando/)
  await settle(); tree = h.render()
  assert.equal(h.calls[0][1], '/admin/academic-terms/active')
  assert.match(textContent(tree), /Período de prueba/)
  assert.equal(tree.props.className, 'termBadge'); h.unmount()
})

test('profile period badge does not substitute a fixed period when the API returns no active term', async () => {
  const h = harness(); h.setHandler(async () => ({ data: { data: null } }))
  const { ProfileActiveTermBadge } = h.load('features/admin/profile/components/ProfileActiveTermBadge.tsx')
  h.render(() => ProfileActiveTermBadge({ className: 'termBadge', label: 'Gestión activa' }))
  await settle(); const tree = h.render()
  assert.match(textContent(tree), /Sin período activo/)
  assert.doesNotMatch(textContent(tree), /II\/2026/); h.unmount()
})

test('profile period errors retain an explicit unavailable state and allow a real retry', async () => {
  const h = harness(); h.setHandler(async () => { throw failure(403) })
  const { ProfileActiveTermBadge } = h.load('features/admin/profile/components/ProfileActiveTermBadge.tsx')
  h.render(() => ProfileActiveTermBadge({ className: 'termBadge', label: 'Gestión activa' }))
  await settle(); let tree = h.render()
  assert.match(textContent(tree), /Información no disponible/)
  h.setHandler(async () => ({ data: { data: null } }))
  nodes(tree, (node) => node.type === 'button')[0].props.onClick()
  tree = h.render(); assert.match(textContent(tree), /Consultando/)
  await settle(); tree = h.render()
  assert.match(textContent(tree), /Sin período activo/)
  assert.equal(h.calls.length, 2); h.unmount()
})
