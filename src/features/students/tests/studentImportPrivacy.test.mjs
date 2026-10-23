import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = fileURLToPath(new URL('../../../', import.meta.url))
const panelPath = resolve(root, 'features/students/components/StudentImportPanel.tsx')
const A = { id: 101, status: 'ACTIVE', roles: ['ADMINISTRADOR'], must_change_password: false }
const B = { ...A, id: 202 }
const preview = () => ({ valid: true, total_rows: 1, valid_rows: 1, error_rows: 0, errors: [], rows: [{
  row: 2, valid: true, errors: [], data: { sis_code: '001234', identity_number: '000123', first_names: 'Ana',
    last_names: 'Ejemplo', email: 'ficticia@umss.edu.bo', career: 'Sistemas', profile_photo: 'ficticia.jpg' },
}] })
const compile = (source) => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX,
} }).outputText

// Installed TypeScript + Node only. Browser storage, clock, timers and React hooks are simulated.
// These tests execute real source; they do not verify browser rendering or browser storage isolation.
function harness({ initialSession = [], opener = null, currentUser = A, navigationType = 'navigate', quotaExceeded = false } = {}) {
  let now = 1_800_000_000_000
  const session = new Map(initialSession)
  const local = new Map([['unrelated', 'preserve']])
  const signals = []
  const timers = new Map()
  let timerId = 0
  const events = new Map()
  const fakeStorage = (values) => ({ getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { if (quotaExceeded && values === session) throw new Error('Storage unavailable'); values.set(key, value); if (values === local) signals.push([key, value]) },
    removeItem: (key) => values.delete(key) })
  const window = { opener, history: { state: null }, performance: { getEntriesByType: () => [{ type: navigationType }] },
    addEventListener: (key, listener) => { if (!events.has(key)) events.set(key, new Set()); events.get(key).add(listener) },
    removeEventListener: (key, listener) => events.get(key)?.delete(listener) }
  const state = []
  const effects = []
  let cursor = 0
  let rerenderRequested = false
  const hooks = {
    useState: (initial) => {
      const index = cursor++
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial
      return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; rerenderRequested = true }]
    },
    useId: () => `test-id-${cursor++}`,
    useRef: (initial) => { const index = cursor++; return state[index] ??= { current: initial } },
    useCallback: (callback) => callback, useMemo: (callback) => callback(),
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
    useEffect: (callback, dependencies) => {
      const index = cursor++
      const old = state[index]
      if (!old || dependencies.some((value, i) => value !== old.dependencies[i])) {
        effects.push(() => { old?.cleanup?.(); state[index] = { dependencies, cleanup: callback() } })
      }
    },
  }
  const auth = { getCurrentUser: async () => currentUser, login: async () => {}, logout: async () => {} }
  const cache = new Map()
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    function localRequire(specifier) {
      if (specifier === 'react') return hooks
      if (specifier === 'react-router') return { useLocation: () => ({ pathname: '/admin/students/import' }), NavLink: 'link' }
      if (specifier.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
      if (specifier === '@/app/config/env') return { env: { useAuthMock: false } }
      if (specifier === '@/features/auth/api/authApi') return auth
      if (specifier === '@/app/providers/AuthContext') return { AuthContext: { Provider: 'provider' } }
      if (specifier === '@/shared/components/Snackbar') return { Snackbar: () => null }
      if (specifier === '@/features/auth/utils/apiErrors') return { getRequestStatus: (error) => error.response?.status }
      if (specifier.startsWith('@/') || specifier.startsWith('.')) {
        const base = specifier.startsWith('@/') ? resolve(root, specifier.slice(2)) : resolve(dirname(filename), specifier)
        return load(existsSync(base + '.ts') ? base + '.ts' : base + '.tsx')
      }
      return require(specifier)
    }
    new Function('require', 'module', 'exports', 'sessionStorage', 'localStorage', 'window', 'crypto', 'Date', 'setTimeout', 'clearTimeout',
      compile(readFileSync(filename, 'utf8')))(localRequire, module, module.exports, fakeStorage(session), fakeStorage(local), window,
      { randomUUID: () => 'opaque-signal' }, { now: () => now },
      (callback, delay) => { const id = ++timerId; timers.set(id, { at: now + delay, callback }); return id },
      (id) => timers.delete(id))
    return module.exports
  }
  const drafts = load(resolve(root, 'features/students/utils/studentImportDraft.ts'))
  function actualFunction(name, dependencies) {
    const source = ts.createSourceFile(panelPath, readFileSync(panelPath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let found
    function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(source); ts.forEachChild(node, visit) }
    visit(source); assert.ok(found, name)
    return new Function('require', 'exports', ...Object.keys(dependencies), compile(found) + `\nreturn ${name}`)(require, {}, ...Object.values(dependencies))
  }
  return { drafts, session, local, signals, auth, timers, actualFunction, hooks,
    render: (component) => { cursor = 0; return component() },
    header: () => { cursor = 0; const element = load(resolve(root, 'shared/components/Header/HeaderNavigation.tsx')).HeaderNavigation({
      items: [{ label: 'Estudiantes', children: [{ label: 'Importar estudiantes', to: '/admin/students/import' }] }],
    }); return element.type(element.props) },
    setNow: (value) => { now = value }, now: () => now,
    advance: (delta) => { now += delta; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback() } },
    event: (key, value = {}) => events.get(key)?.forEach((listener) => listener(value)),
    provider: () => { cursor = 0; const node = load(resolve(root, 'app/providers/AuthProvider.tsx')).AuthProvider({ children: null }); return node.props.value },
    flushEffects: () => { effects.splice(0).forEach((effect) => effect()) },
    wantsRerender: () => rerenderRequested,
  }
}
function saved(h) { h.drafts.setStudentImportIdentity(A); return h.drafts.saveStudentImportDraft(preview(), h.drafts.captureStudentImportContext()) }
function stored(h) { return JSON.parse(h.session.get(h.drafts.STUDENT_IMPORT_DRAFT_KEY)) }
const tick = () => new Promise((done) => setImmediate(done))

test('A generates an allowlisted draft with 60-minute absolute lifetime and text identifiers', () => {
  const h = harness(); const d = saved(h)
  assert.deepEqual(Object.keys(d).sort(), ['createdAt', 'expiresAt', 'ownerId', 'preview', 'version'])
  assert.equal(d.expiresAt - d.createdAt, 3_600_000)
  assert.equal(d.ownerId, A.id)
  assert.equal(d.preview.rows[0].data.sis_code, '001234')
  assert.equal(d.preview.rows[0].data.identity_number, '000123')
  assert.equal(h.local.get('unrelated'), 'preserve')
  assert.equal(h.local.size, 1)
})

test('navigation and reload with verified A preserve the original deadline', () => {
  const h = harness(); const d = saved(h)
  h.advance(1000)
  assert.equal(h.drafts.readStudentImportDraft().expiresAt, d.expiresAt)
  const reloaded = harness({ initialSession: [...h.session] })
  reloaded.setNow(h.now())
  assert.equal(reloaded.drafts.readStudentImportDraft(), null, 'No recovery before authentication')
  reloaded.drafts.setStudentImportIdentity(A)
  assert.deepEqual(reloaded.drafts.readStudentImportDraft(), d)
})

test('B cannot recover A; same role is insufficient', () => {
  const h = harness(); saved(h)
  const other = harness({ initialSession: [...h.session] })
  other.drafts.setStudentImportIdentity(B)
  assert.equal(other.drafts.readStudentImportDraft(), null)
  assert.equal(other.session.size, 0)
})

test('TTL is valid at 59:59.999 and expires at exactly 60:00 without renewal', () => {
  const h = harness(); const d = saved(h)
  h.advance(3_599_999)
  assert.equal(h.drafts.readStudentImportDraft().expiresAt, d.expiresAt)
  h.advance(1)
  assert.equal(h.drafts.useStudentImportDraft(), null)
  assert.equal(h.session.size, 0)
})

for (const [name, change] of [
  ['missing owner', (d) => { delete d.ownerId }], ['altered owner', (d) => { d.ownerId = B.id }],
  ['old version', (d) => { d.version = 0 }], ['corrupt preview', (d) => { d.preview.rows = null }],
  ['numeric SIS', (d) => { d.preview.rows[0].data.sis_code = 1234 }],
  ['numeric CI', (d) => { d.preview.rows[0].data.identity_number = 123 }],
  ['inconsistent counters', (d) => { d.preview.valid_rows = 100 }],
  ['future creation', (d) => { d.createdAt += 1; d.expiresAt += 1 }],
  ['extended deadline', (d) => { d.expiresAt += 1 }],
  ['unsafe timestamp', (d) => { d.createdAt = Number.MAX_SAFE_INTEGER + 1 }],
]) test(`${name} is rejected and cleaned`, () => {
  const h = harness(); saved(h); const d = stored(h); change(d)
  h.session.set(h.drafts.STUDENT_IMPORT_DRAFT_KEY, JSON.stringify(d))
  assert.equal(h.drafts.readStudentImportDraft(), null)
  assert.equal(h.session.size, 0)
})

test('corrupt and excessive JSON are removed without exposing their contents', () => {
  for (const raw of ['{broken', 'x'.repeat(16 * 1024 * 1024 + 1)]) {
    const h = harness(); h.drafts.setStudentImportIdentity(A)
    h.session.set(h.drafts.STUDENT_IMPORT_DRAFT_KEY, raw)
    assert.equal(h.drafts.readStudentImportDraft(), null)
    assert.equal(h.session.size, 0)
  }
})

test('unexpected fields, final results and secret fields are stripped on save and recovery', () => {
  const h = harness(); h.drafts.setStudentImportIdentity(A)
  const p = preview(); p.results = [{ student_id: 77 }]; p.password = 'synthetic-secret'
  p.rows[0].data.token = 'synthetic-token'; p.rows[0].student_id = 77
  h.drafts.saveStudentImportDraft(p, h.drafts.captureStudentImportContext())
  let raw = h.session.get(h.drafts.STUDENT_IMPORT_DRAFT_KEY)
  assert.doesNotMatch(raw, /student_id|results|password|token|synthetic/)
  const d = stored(h); d.token = 'synthetic'; d.preview.audit_status = 'RECORDED'
  h.session.set(h.drafts.STUDENT_IMPORT_DRAFT_KEY, JSON.stringify(d))
  h.drafts.readStudentImportDraft()
  raw = h.session.get(h.drafts.STUDENT_IMPORT_DRAFT_KEY)
  assert.doesNotMatch(raw, /audit_status|token|synthetic/)
})

test('legacy global preview is deleted, never parsed or assigned to A', () => {
  const h = harness()
  h.local.set('eida_last_import_preview', '{old-unowned-data')
  h.local.set('eida_last_student_import_preview', 'inactive-hook-unrelated-to-active-flow')
  h.drafts.setStudentImportIdentity(A)
  assert.equal(h.local.has('eida_last_import_preview'), false)
  assert.equal(h.local.has('eida_last_student_import_preview'), true)
  assert.equal(h.drafts.readStudentImportDraft(), null)
})

for (const user of [null, { ...A, roles: ['DOCENTE'] }, { ...A, status: 'INACTIVE' }, { ...A, must_change_password: true }]) {
  test(`unverified or ineligible user cannot save/read (${JSON.stringify(user)})`, () => {
    const h = harness(); h.drafts.setStudentImportIdentity(user)
    assert.equal(h.drafts.captureStudentImportContext(), null)
    assert.equal(h.drafts.saveStudentImportDraft(preview(), null), null)
  })
}

test('identity change invalidates pending operation tokens even when A signs in again', () => {
  const h = harness(); saved(h); const old = h.drafts.captureStudentImportContext()
  h.drafts.setStudentImportIdentity(B)
  h.drafts.setStudentImportIdentity(A)
  assert.equal(h.drafts.isCurrentStudentImportContext(old), false)
  assert.equal(h.drafts.saveStudentImportDraft(preview(), old), null)
})

test('cross-tab signal invalidates local memory/storage and transmits no personal data', () => {
  const h = harness(); saved(h); let remote = 0
  const stop = h.drafts.startStudentImportSessionSync(() => remote++)
  h.event('storage', { key: 'unrelated', newValue: 'value' })
  assert.equal(remote, 0)
  h.event('storage', { key: 'eida_hu05_invalidation', newValue: 'opaque-signal' })
  assert.equal(remote, 1)
  assert.equal(h.drafts.captureStudentImportContext(), null)
  assert.equal(h.session.size, 0)
  assert.equal(h.signals.length, 0, 'Incoming signals do not echo')
  h.drafts.invalidateStudentImportSession()
  assert.deepEqual(h.signals, [['eida_hu05_invalidation', 'opaque-signal']])
  assert.equal(h.local.has('eida_hu05_invalidation'), false)
  stop()
})

test('opener-inherited draft is removed; independent new tabs start empty', () => {
  const original = harness(); saved(original)
  const opened = harness({ initialSession: [...original.session], opener: {} })
  opened.drafts.startStudentImportSessionSync(() => {})
  opened.drafts.setStudentImportIdentity(A)
  assert.equal(opened.drafts.readStudentImportDraft(), null)
  const independent = harness(); independent.drafts.setStudentImportIdentity(A)
  assert.equal(independent.drafts.readStudentImportDraft(), null)
})

test('restored tab still requires verified identity and rejects an expired record', () => {
  const original = harness(); saved(original)
  const restored = harness({ initialSession: [...original.session] })
  restored.setNow(original.now() + 3_600_000)
  assert.equal(restored.drafts.readStudentImportDraft(), null)
  restored.drafts.setStudentImportIdentity(A)
  assert.equal(restored.session.size, 0)
})

test('AuthProvider restores verified A, cleans logout immediately, and rejects late writes', async () => {
  const h = harness(); let value = h.provider(); h.flushEffects(); await tick(); value = h.provider()
  assert.equal(value.user.id, A.id)
  saved(h); const old = h.drafts.captureStudentImportContext()
  let finish; h.auth.logout = () => new Promise((resolveRequest) => { finish = resolveRequest })
  const logout = value.logout()
  assert.equal(h.session.size, 0)
  assert.equal(h.drafts.saveStudentImportDraft(preview(), old), null)
  finish(); await logout
  assert.equal(h.provider().user, null)
})

for (const reason of ['SESSION_EXPIRED', 'SESSION_REPLACED']) test(`real auth event ${reason} clears HU05`, async () => {
  const h = harness(); h.provider(); h.flushEffects(); await tick(); const value = h.provider(); saved(h)
  // AuthEventHandler's actual subscription uses clearSession for both detected reasons.
  const filename = resolve(root, 'features/auth/components/AuthEventHandler.tsx')
  let receive
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compile(readFileSync(filename, 'utf8')))((specifier) => {
    if (specifier === 'react') return { useEffect: (effect) => effect() }
    if (specifier === 'react-router') return { useLocation: () => ({ pathname: '/admin/students/import' }), useNavigate: () => () => {}, Outlet: 'outlet' }
    if (specifier.endsWith('/useAuth')) return { useAuth: () => ({ ...value, isAuthenticated: true }) }
    if (specifier.endsWith('/authEvents')) return { subscribeToAuthSessionEvents: (handler) => { receive = handler; return () => {} } }
    if (specifier.endsWith('/authRoutes')) return { AUTH_ROUTES: { login: '/login' } }
    return require(specifier)
  }, module, module.exports)
  module.exports.AuthEventHandler(); receive({ reason })
  assert.equal(h.session.size, 0)
  assert.equal(h.provider().user, null)
})

test('late validation HTTP response after logout/change of account cannot update any student UI state', async () => {
  for (const change of [(h) => h.drafts.invalidateStudentImportSession(), (h) => h.drafts.setStudentImportIdentity(B)]) {
    const h = harness(); saved(h)
    const context = h.drafts.captureStudentImportContext(); const operation = { current: 0 }
    const updates = []; let resolvePreview
    const active = h.actualFunction('isActiveOperation', { mounted: { current: true }, operation,
      importContext: context, isCurrentStudentImportContext: h.drafts.isCurrentStudentImportContext })
    const validate = h.actualFunction('handleValidate', {
      selectedFile: {}, importContext: context, operation, isCurrentStudentImportContext: h.drafts.isCurrentStudentImportContext,
      isActiveOperation: active, validateStudentImportCsv: async () => ({ isValid: true }),
      previewStudentImport: () => new Promise((done) => { resolvePreview = done }),
      saveStudentImportDraft: h.drafts.saveStudentImportDraft, STUDENT_IMPORT_DRAFT_TTL: h.drafts.STUDENT_IMPORT_DRAFT_TTL,
      setFlowState: (v) => updates.push(v), setValidationMessage: () => {}, setPreview: (v) => updates.push(v),
      setConfirmation: () => {}, setPreviewExpiresAt: () => {}, notify: () => {},
      buildPreviewMessage: () => '', getStudentImportErrorMessage: () => '', getInvalidFileMessage: () => '',
    })
    const pending = validate(); await tick(); change(h); updates.length = 0
    resolvePreview(preview()); await pending
    assert.deepEqual(updates, [])
    assert.equal(h.session.size, 0)
  }
})

test('cancel invokes draft cleanup before navigating', () => {
  const h = harness(); saved(h)
  const steps = []
  h.actualFunction('handleCancel', { clearSelection: () => { h.drafts.clearStudentImportDraft(); steps.push('clear') },
    navigate: (path) => steps.push(path), STUDENTS_PATH: '/admin/students/manage' })()
  assert.deepEqual(steps, ['clear', '/admin/students/manage'])
  assert.equal(h.session.size, 0)
})

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((item) => elements(item, predicate))
  if (!node || typeof node !== 'object') return []
  return [...(predicate(node) ? [node] : []), ...elements(node.props?.children, predicate)]
}

test('menu reacts to creation, confirmation/cancel, expiry and identity invalidation', () => {
  const h = harness(); h.drafts.setStudentImportIdentity(A)
  let tree = h.header()
  elements(tree, (node) => node.type === 'button')[0].props.onClick()
  const lastImport = () => elements(h.header(), (node) => node.props?.children === 'Ultima importacion')
  assert.equal(lastImport().length, 0)
  saved(h); assert.equal(lastImport().length, 1)
  h.drafts.clearStudentImportDraft(); assert.equal(lastImport().length, 0)
  saved(h); h.advance(3_600_000); assert.equal(lastImport().length, 0)
  saved(h); h.drafts.setStudentImportIdentity(B); assert.equal(lastImport().length, 0)
})

test('existing preview filters and pagination still select the expected rows', () => {
  const h = harness()
  const rows = Array.from({ length: 23 }, (_, index) => ({ ...preview().rows[0], row: index + 2,
    valid: index % 2 === 0, errors: index % 2 === 0 ? [] : ['Observación de prueba.'] }))
  const data = { valid: false, total_rows: 23, valid_rows: 12, error_rows: 11, rows, errors: [] }
  const summary = () => null; const table = () => null
  const review = h.actualFunction('StudentImportReview', { useState: h.hooks.useState, PAGE_SIZE: 10,
    styles: {}, StudentImportSummary: summary, StudentImportPreviewTable: table,
    PreviewMessage: () => null, FileObservations: () => null,
    InfoIcon: () => null, FileIcon: () => null, ArrowRightIcon: () => null, DownloadIcon: () => null,
    downloadCurrentView: () => {}, formatFileSize: () => '' })
  const render = () => h.render(() => review({ file: null, preview: data, message: null, isConfirming: false,
    canConfirm: true, onChangeFile: () => {}, onCancel: () => {}, onConfirm: () => {} }))
  let tree = render()
  assert.equal(elements(tree, (node) => node.type === table)[0].props.rows.length, 10)
  const confirmButton = elements(tree, (node) => node.type === 'button' && node.props.children?.[0] === 'Confirmar importación')[0]
  assert.equal(confirmButton.props.disabled, true)
  elements(tree, (node) => node.type === 'button' && node.props.children === 'Siguiente')[0].props.onClick()
  tree = render()
  assert.equal(elements(tree, (node) => node.type === table)[0].props.rows[0].row, 12)
  elements(tree, (node) => node.type === summary)[0].props.onFilterChange('invalid')
  tree = render()
  const pageRows = elements(tree, (node) => node.type === table)[0].props.rows
  assert.equal(pageRows.length, 10)
  assert.ok(pageRows.every((row) => !row.valid))
  assert.equal(pageRows[0].row, 3, 'Filter resets pagination')
})

function confirmationFlow(h, response) {
  const state = { flow: 'preview', confirmation: null, unknown: null }
  const context = h.drafts.captureStudentImportContext(); const operation = { current: 0 }
  const active = h.actualFunction('isActiveOperation', { mounted: { current: true }, operation,
    importContext: context, isCurrentStudentImportContext: h.drafts.isCurrentStudentImportContext })
  let requests = 0
  const confirm = () => h.actualFunction('handleConfirm', {
    selectedFile: {}, canConfirm: state.flow === 'preview', confirmationRequestInFlight: { current: false },
    isCurrentStudentImportContext: h.drafts.isCurrentStudentImportContext, importContext: context, previewExpiresAt: null,
    clearStudentImportDraft: h.drafts.clearStudentImportDraft, operation, isActiveOperation: active,
    confirmStudentImport: async () => { requests++; return response() },
    discardDraft: h.drafts.clearStudentImportDraft,
    setConfirmation: (value) => { state.confirmation = value }, setFlowState: (value) => { state.flow = value },
    setValidationMessage: () => {}, setUnknownMessage: (value) => { state.unknown = value },
    getStudentImportOutcome: () => ({ kind: 'complete', title: 'Resultado', message: '', auditWarning: false }),
    getStudentImportErrorMessage: () => 'Resultado desconocido', StudentImportError: class extends Error {}, notify: () => {},
  })()
  return { state, confirm, requests: () => requests }
}

for (const result of [
  { imported_rows: 1, skipped_rows: 0, failed_rows: 0 },
  { imported_rows: 1, skipped_rows: 1, failed_rows: 1 },
  { imported_rows: 0, skipped_rows: 1, failed_rows: 1 },
]) test(`definitive confirmation clears draft but preserves FIX-011 state ${JSON.stringify(result)}`, async () => {
  const h = harness(); saved(h)
  const flow = confirmationFlow(h, () => result)
  await flow.confirm()
  assert.equal(h.session.size, 0)
  assert.equal(flow.state.flow, 'success')
  assert.deepEqual(flow.state.confirmation, result)
})

test('unknown confirmation removes recoverable draft and retains warning without retry', async () => {
  const h = harness(); saved(h)
  const flow = confirmationFlow(h, () => { throw new Error('Lost response') })
  await flow.confirm(); await flow.confirm()
  assert.equal(h.session.size, 0)
  assert.equal(flow.state.flow, 'unknown')
  assert.equal(flow.state.unknown, 'Resultado desconocido')
  assert.equal(flow.requests(), 1)
})

test('reload during a pending POST cannot recover it; late confirmation after logout is ignored', async () => {
  const h = harness(); saved(h); let finish
  const flow = confirmationFlow(h, () => new Promise((done) => { finish = done }))
  const pending = flow.confirm()
  assert.equal(h.session.size, 0, 'Cleared before dispatching the POST')
  const restored = harness({ initialSession: [...h.session] }); restored.drafts.setStudentImportIdentity(A)
  assert.equal(restored.drafts.readStudentImportDraft(), null)
  h.drafts.invalidateStudentImportSession()
  finish({ imported_rows: 1 }); await pending
  assert.equal(flow.state.confirmation, null)
})

test('opener tab can reload its own new draft; foreign restored owner is rejected', () => {
  const h = harness(); saved(h)
  const reload = harness({ initialSession: [...h.session], opener: {}, navigationType: 'reload' })
  reload.drafts.startStudentImportSessionSync(() => {}); reload.drafts.setStudentImportIdentity(A)
  assert.ok(reload.drafts.readStudentImportDraft())
  const foreign = harness({ initialSession: [...h.session], navigationType: 'back_forward' })
  foreign.drafts.setStudentImportIdentity(B)
  assert.equal(foreign.drafts.readStudentImportDraft(), null)
})

test('remote invalidation also clears AuthProvider identity using existing protected-route behavior', async () => {
  const h = harness(); h.provider(); h.flushEffects(); await tick(); h.provider(); saved(h)
  h.event('storage', { key: 'eida_hu05_invalidation', newValue: 'opaque' })
  assert.equal(h.provider().user, null)
  assert.equal(h.session.size, 0)
})

test('failed logout keeps verified access but never restores the removed draft', async () => {
  const h = harness(); h.provider(); h.flushEffects(); await tick(); const value = h.provider(); saved(h)
  h.auth.logout = async () => { throw { response: { status: 500 } } }
  await assert.rejects(value.logout())
  assert.equal(h.provider().user.id, A.id)
  assert.ok(h.drafts.captureStudentImportContext())
  assert.equal(h.drafts.readStudentImportDraft(), null)
})

test('AuthProvider login uses freshly verified B and discards A state', async () => {
  const h = harness(); h.provider(); h.flushEffects(); await tick(); const value = h.provider(); saved(h)
  h.auth.getCurrentUser = async () => B
  await value.login({ identifier: 'ficticia', password: 'synthetic' })
  assert.equal(h.provider().user.id, B.id)
  assert.equal(h.drafts.readStudentImportDraft(), null)
  assert.equal(h.drafts.captureStudentImportContext().ownerId, B.id)
})

test('storage quota failure does not invent a recoverable draft or change unrelated storage', () => {
  const h = harness({ quotaExceeded: true }); h.drafts.setStudentImportIdentity(A)
  assert.equal(h.drafts.saveStudentImportDraft(preview(), h.drafts.captureStudentImportContext()), null)
  assert.equal(h.drafts.useStudentImportDraft(), null)
  assert.equal(h.local.get('unrelated'), 'preserve')
})

test('a queued expiry callback from A cannot delete a new draft from B', () => {
  const h = harness(); saved(h)
  const oldTimer = [...h.timers.values()][0].callback
  h.drafts.setStudentImportIdentity(B)
  h.drafts.saveStudentImportDraft(preview(), h.drafts.captureStudentImportContext())
  oldTimer()
  assert.equal(h.drafts.readStudentImportDraft().ownerId, B.id)
})
