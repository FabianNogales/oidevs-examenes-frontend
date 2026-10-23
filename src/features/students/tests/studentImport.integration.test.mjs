import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const moduleRoot = fileURLToPath(new URL('../', import.meta.url))
const sourceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const file = new Blob(['sis_code,identity_number\n'], { type: 'text/csv' })

function compile(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText
}

// Run the real TypeScript API and React server rendering; replace only HTTP/router/auth boundaries.
// This verifies behavior and markup, not browser appearance or CSS layout.
function client(handler = () => { throw new Error('Unexpected HTTP request') }, location = { state: { view: 'new' } }) {
  const calls = []
  const navigation = []
  const httpClient = { post: async (...args) => { calls.push(args); return handler(...args) } }
  const cache = new Map()
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const localRequire = (specifier) => {
      if (specifier === '@/shared/api/httpClient') return { httpClient }
      if (specifier === '@/features/auth/hooks/useAuth') return { useAuth: () => ({ notify: () => {} }) }
      if (specifier === 'react' && filename.endsWith('studentImportDraft.ts')) return {
        ...React, useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
      }
      if (specifier === 'react-router') return {
        useNavigate: () => (path) => navigation.push(path), useLocation: () => location,
      }
      if (specifier.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
      if (specifier.startsWith('@/') || specifier.startsWith('.')) {
        const base = specifier.startsWith('@/') ? resolve(sourceRoot, specifier.slice(2)) : resolve(dirname(filename), specifier)
        return load(existsSync(base + '.ts') ? base + '.ts' : base + '.tsx')
      }
      return require(specifier)
    }
    new Function('require', 'module', 'exports', compile(readFileSync(filename, 'utf8')))(localRequire, module, module.exports)
    return module.exports
  }
  const drafts = load(resolve(moduleRoot, 'utils/studentImportDraft.ts'))
  drafts.setStudentImportIdentity({ id: 1, status: 'ACTIVE', roles: ['ADMINISTRADOR'], must_change_password: false })
  return { api: load(resolve(moduleRoot, 'api/studentImportApi.ts')), drafts, calls, navigation,
    component: (name) => load(resolve(moduleRoot, 'components/' + name + '.tsx'))[name] }
}

function sourceFunction(name) {
  const filename = resolve(moduleRoot, 'components/StudentImportPanel.tsx')
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let found
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(source)
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.ok(found, `Missing real function ${name}`)
  return found
}

function actualFunction(name, dependencies) {
  return new Function(...Object.keys(dependencies), compile(sourceFunction(name)) + `\nreturn ${name}`)(...Object.values(dependencies))
}

function fixture(statuses = ['IMPORTED']) {
  const rows = statuses.map((status, index) => ({
    row: index * 2 + 2, valid: status !== 'SKIPPED', errors: status === 'SKIPPED' ? ['La carrera indicada no existe.'] : [],
    data: { sis_code: `00100${index}`, identity_number: `00012${index}`, first_names: 'Ana', last_names: 'Pérez',
      email: `ana${index}@umss.edu.bo`, career: 'Sistemas', profile_photo: 'ana.jpg' },
  }))
  const results = rows.map((row, index) => ({ row: row.row, sis_code: row.data.sis_code, status: statuses[index],
    errors: statuses[index] === 'FAILED' ? ['La creación de esta fila fue revertida.'] : row.errors,
    student_id: statuses[index] === 'IMPORTED' ? index + 1 : null }))
  return {
    ...preview(rows), imported_rows: statuses.filter((s) => s === 'IMPORTED').length,
    skipped_rows: statuses.filter((s) => s === 'SKIPPED').length,
    failed_rows: statuses.filter((s) => s === 'FAILED').length,
    results, audit_status: 'RECORDED', warnings: [],
  }
}

function preview(rows = fixture().rows) {
  const invalid = rows.filter((r) => !r.valid).length
  return { valid: invalid === 0, total_rows: rows.length, valid_rows: rows.length - invalid,
    error_rows: invalid, errors: [], rows }
}
const body = (data) => ({ data: { success: true, message: 'Resultado de Laravel.', data } })
function httpError(status, data) {
  const { AxiosError } = require('axios')
  return new AxiosError('HTTP error', 'ERR_BAD_RESPONSE', undefined, undefined, { status, data })
}

function workflow(client, initial = {}) {
  const state = { flow: 'preview', confirmation: null, validationMessage: null, unknownMessage: null, ...initial }
  const notifications = []
  const lock = { current: false }
  const operation = { current: 0 }
  const importContext = client.drafts.captureStudentImportContext()
  const isActiveOperation = actualFunction('isActiveOperation', { mounted: { current: true }, operation,
    importContext, isCurrentStudentImportContext: client.drafts.isCurrentStudentImportContext })
  const setters = Object.fromEntries(['flow', 'confirmation', 'validationMessage', 'unknownMessage'].map((key) => [
    'set' + key[0].toUpperCase() + key.slice(1) + (key === 'flow' ? 'State' : ''), (value) => { state[key] = value },
  ]))
  const confirm = () => actualFunction('handleConfirm', {
    ...setters, selectedFile: state.file === null ? null : file, canConfirm: state.flow === 'preview',
    confirmationRequestInFlight: lock, confirmStudentImport: client.api.confirmStudentImport,
    getStudentImportOutcome: client.api.getStudentImportOutcome, StudentImportError: client.api.StudentImportError,
    getStudentImportErrorMessage: client.api.getStudentImportErrorMessage,
    notify: (...args) => notifications.push(args),
    operation, importContext, isActiveOperation, previewExpiresAt: null,
    isCurrentStudentImportContext: client.drafts.isCurrentStudentImportContext,
    clearStudentImportDraft: client.drafts.clearStudentImportDraft,
    discardDraft: client.drafts.clearStudentImportDraft,
  })()
  return { state, notifications, lock, confirm }
}

test('preview preserves normalized text and means readiness, not persistence', async () => {
  const data = preview()
  const c = client(() => body(data))
  assert.deepEqual(await c.api.previewStudentImport(file), data)
  assert.equal(c.calls[0][0], '/admin/students/import/preview')
  assert.ok(c.calls[0][1].get('file') instanceof Blob)
  const message = actualFunction('buildPreviewMessage', {})(data)
  assert.match(message, /listos para ser importados/)
  assert.doesNotMatch(message, /registrados|completada/)
})

for (const [name, statuses, kind] of [
  ['complete', ['IMPORTED', 'IMPORTED'], 'complete'],
  ['partial skipped', ['IMPORTED', 'SKIPPED'], 'partial'],
  ['partial failed', ['IMPORTED', 'FAILED'], 'partial'],
  ['three categories', ['IMPORTED', 'SKIPPED', 'FAILED'], 'partial'],
  ['all skipped', ['SKIPPED'], 'none'], ['all failed', ['FAILED'], 'none'],
  ['none created mixed', ['SKIPPED', 'FAILED'], 'none'], ['empty file with headers', [], 'none'],
]) {
  test(`confirmation ${name}: counters, final states and classification`, async () => {
    const data = fixture(statuses)
    const c = client(() => body(data))
    assert.deepEqual(await c.api.confirmStudentImport(file), data)
    assert.equal(c.api.getStudentImportOutcome(data).kind, kind)
    const flow = workflow(c)
    await flow.confirm()
    assert.equal(flow.state.flow, 'success')
    assert.equal(flow.notifications[0][0], kind === 'complete' ? 'success' : 'info')
    for (const label of ['Procesados', 'Importados', 'Omitidos', 'Fallidos']) assert.match(flow.notifications[0][1], new RegExp(label))
    assert.equal(c.calls[0][0], '/admin/students/import/confirm')
  })
}

test('physical lines, SIS leading zeros and null student_id on skipped/failed remain exact', async () => {
  const data = fixture(['IMPORTED', 'SKIPPED', 'FAILED'])
  const c = client(() => body(data))
  const result = await c.api.confirmStudentImport(file)
  assert.deepEqual(result.results.map((r) => r.row), [2, 4, 6])
  assert.deepEqual(result.results.map((r) => r.sis_code), ['001000', '001001', '001002'])
  assert.deepEqual(result.results.map((r) => r.student_id), [1, null, null])
  assert.equal(result.rows[0].data.identity_number, '000120')
})

for (const [name, mutate] of [
  ['missing counter', (d) => { delete d.skipped_rows }],
  ['negative', (d) => { d.failed_rows = -1 }], ['fraction', (d) => { d.total_rows = 1.5 }],
  ['preview sum', (d) => { d.valid_rows++ }], ['import sum', (d) => { d.imported_rows++ }],
  ['skipped vs validation', (d) => { d.skipped_rows++; d.failed_rows-- }],
  ['result length', (d) => { d.results.pop() }], ['state', (d) => { d.results[0].status = 'UNKNOWN' }],
  ['null imported id', (d) => { d.results[0].student_id = null }],
  ['non-null skipped id', (d) => { d.results[1].student_id = 44 }],
  ['zero imported id', (d) => { d.results[0].student_id = 0 }],
  ['non-null failed id', (d) => { d.results[2].student_id = 44 }],
  ['non-string errors', (d) => { d.results[1].errors = [false] }],
  ['missing reason', (d) => { d.results[2].errors = [] }],
  ['numeric SIS', (d) => { d.results[0].sis_code = 1000 }],
  ['numeric CI', (d) => { d.rows[0].data.identity_number = 120 }],
  ['unknown row', (d) => { d.results[0].row = 77 }],
  ['wrong SIS', (d) => { d.results[0].sis_code = '999' }],
  ['duplicate result line', (d) => { d.results[1].row = d.results[0].row }],
  ['invalid line', (d) => { d.rows[0].row = 1 }],
  ['wrong audit state', (d) => { d.audit_status = 'OK' }],
  ['missing warnings', (d) => { delete d.warnings }],
  ['counter/status mismatch', (d) => { d.imported_rows = 0; d.failed_rows = 2 }],
]) {
  test(`incompatible POST result (${name}) is unknown with no automatic retry`, async () => {
    const data = fixture(['IMPORTED', 'SKIPPED', 'FAILED'])
    mutate(data)
    const c = client(() => body(data))
    const flow = workflow(c)
    await flow.confirm()
    assert.equal(flow.state.flow, 'unknown')
    assert.equal(flow.state.confirmation, null)
    assert.match(flow.state.unknownMessage, /podrían haberse creado/)
    await flow.confirm()
    assert.equal(c.calls.length, 1)
    assert.equal(flow.lock.current, false)
  })
}

for (const [name, error] of [
  ['network', new Error('Network error')], ['timeout', Object.assign(new Error('Timeout'), { code: 'ECONNABORTED' })],
  ['server 500', httpError(500, { message: 'Server Error' })],
  ['unreliable 422', httpError(422, { message: 'Invalid' })],
]) {
  test(`${name} leaves confirmation unknown and does not resend`, async () => {
    const c = client(() => { throw error })
    const flow = workflow(c)
    await flow.confirm()
    assert.equal(flow.state.flow, 'unknown')
    await flow.confirm()
    assert.equal(c.calls.length, 1)
  })
}

test('HTTP 422 known file rejection displays the actual validation errors', async () => {
  const c = client(() => { throw httpError(422, { errors: { file: ['El archivo debe ser CSV.', 'El archivo es obligatorio.'] } }) })
  const flow = workflow(c)
  await flow.confirm()
  assert.equal(flow.state.flow, 'preview')
  assert.equal(flow.state.validationMessage, 'El archivo debe ser CSV. El archivo es obligatorio.')
  assert.equal(flow.state.confirmation, null)
})

test('structurally rejected CSV without confirmation results is a known rejection', async () => {
  const data = { valid: false, total_rows: 0, valid_rows: 0, error_rows: 0,
    errors: ['Las columnas del CSV no coinciden con las columnas requeridas.'], rows: [] }
  for (const result of [data, { ...data, imported_rows: 0, skipped_rows: 0, failed_rows: 0, results: [], audit_status: 'RECORDED', warnings: [] }]) {
    const c = client(() => body(result))
    await assert.rejects(c.api.confirmStudentImport(file), (error) => error.outcome === 'rejected' && error.message === data.errors[0])
  }
})

test('untrusted envelope after POST is unknown', async () => {
  for (const response of [{ data: '<html>Error</html>' }, { data: { success: false, data: fixture() } }, body({})]) {
    const c = client(() => response)
    await assert.rejects(c.api.confirmStudentImport(file), (error) => error.outcome === 'unknown')
    assert.equal(c.calls.length, 1)
  }
})

test('concurrent confirmation and a recovered preview without File cannot resend', async () => {
  let finish
  const c = client(() => new Promise((resolveResponse) => { finish = resolveResponse }))
  const flow = workflow(c)
  const pending = flow.confirm()
  await flow.confirm()
  assert.equal(c.calls.length, 1)
  finish(body(fixture()))
  await pending
  const recovered = workflow(c, { file: null })
  await recovered.confirm()
  assert.equal(c.calls.length, 1)
})

for (const audit_status of ['RECORDED', 'FAILED']) {
  test(`audit ${audit_status} with warnings preserves created rows and has a separate notice`, async () => {
    const data = { ...fixture(), audit_status, warnings: ['Advertencia del resumen.'] }
    const c = client(() => body(data))
    const flow = workflow(c)
    await flow.confirm()
    assert.equal(flow.state.confirmation.imported_rows, 1)
    assert.equal(flow.state.confirmation.failed_rows, 0)
    assert.equal(flow.notifications[0][0], 'info')
    const markup = renderToStaticMarkup(React.createElement(c.component('StudentImportSuccess'), {
      confirmation: data, onImportAnotherFile: () => {}, onBackToPanel: () => {},
    }))
    assert.match(markup, /Advertencia del resumen/)
    assert.match(markup, /STUDENT_IMPORT/)
    assert.match(markup, /no cambia las filas importadas/)
    assert.match(markup, /Importación completa/)
  })
}

test('FAILED audit summary without warnings still shows a warning, not a failed student', () => {
  const data = { ...fixture(), audit_status: 'FAILED' }
  const c = client()
  assert.equal(c.api.getStudentImportOutcome(data).auditWarning, true)
  const markup = renderToStaticMarkup(React.createElement(c.component('StudentImportSuccess'), {
    confirmation: data, onImportAnotherFile: () => {}, onBackToPanel: () => {},
  }))
  assert.match(markup, /No se registró el resumen de auditoría/)
  assert.match(markup, /Importado/)
})

test('final markup contains four counters, Spanish states, physical lines, SIS and reasons', () => {
  const c = client()
  const markup = renderToStaticMarkup(React.createElement(c.component('StudentImportSuccess'), {
    confirmation: fixture(['IMPORTED', 'SKIPPED', 'FAILED']), onImportAnotherFile: () => {}, onBackToPanel: () => {},
  }))
  for (const text of ['Procesados', 'Importados', 'Omitidos', 'Fallidos', 'Línea del CSV', '001001', 'Importado', 'Omitido', 'Fallido',
    'La carrera indicada no existe.', 'La creación de esta fila fue revertida.', 'Volver a Gestión de estudiantes']) assert.ok(markup.includes(text), text)
  assert.match(markup, /<td>4<\/td>/)
  assert.doesNotMatch(markup, /No importados/)
})

test('large result sets have a pager and state the visible subset explicitly', () => {
  const c = client()
  const markup = renderToStaticMarkup(React.createElement(c.component('StudentImportSuccess'), {
    confirmation: fixture(Array(21).fill('IMPORTED')), onImportAnotherFile: () => {}, onBackToPanel: () => {},
  }))
  assert.match(markup, /Mostrando 1 a 10 de 21 resultados/)
  assert.match(markup, /Página 1 de 3/)
  assert.match(markup, /Siguiente/)
  assert.equal((markup.match(/<td>Importado<\/td>/g) ?? []).length, 10)
})

test('preview preserves career, SIS, CI and email validation messages exactly', () => {
  const c = client()
  const row = fixture(['SKIPPED']).rows[0]
  row.errors = ['La carrera indicada no existe.', 'El código SIS ya existe.', 'El CI ya está registrado.', 'El correo debe ser institucional.']
  const markup = renderToStaticMarkup(React.createElement(c.component('StudentImportPreviewTable'), { rows: [row] }))
  for (const message of row.errors) assert.ok(markup.includes(message), message)
  assert.doesNotMatch(markup, />Ya existe</)
})

test('last import recovers only the existing preview and keeps confirmation disabled without a File', () => {
  const data = preview()
  const writes = []
  const values = new Map()
  globalThis.sessionStorage = { getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: (key) => { values.delete(key); writes.push(key) } }
  try {
    const c = client(undefined, { state: { view: 'resume' } })
    c.drafts.saveStudentImportDraft(data, c.drafts.captureStudentImportContext())
    writes.length = 0
    assert.deepEqual(c.drafts.readStudentImportDraft().preview, data)
    const markup = renderToStaticMarkup(React.createElement(c.component('StudentImportPanel')))
    assert.match(markup, /Archivo recuperado \(sesión anterior\)/)
    assert.match(markup, /disabled="">Confirmar importación/)
    assert.match(markup, /Descargar vista actual CSV/)
    assert.match(markup, /Mostrando 1 a 1 de 1 estudiantes/)
    assert.equal(c.calls.length, 0)
    assert.deepEqual(writes, [])
    c.drafts.clearStudentImportDraft()
  } finally { delete globalThis.sessionStorage }
})

test('unknown state and final results map to truthful page steps', () => {
  const step = actualFunction('toStep', {})
  assert.equal(step('unknown'), 'unknown')
  assert.equal(step('success'), 'success')
  assert.equal(step('confirming'), 'preview')
})

test('navigation back uses the student management route; confirmed results are not stored', async () => {
  const destinations = []
  actualFunction('handleCancel', { clearSelection: () => {},
    navigate: (path) => destinations.push(path), STUDENTS_PATH: '/admin/students/manage' })()
  assert.deepEqual(destinations, ['/admin/students/manage'])
  // Confirmation clears the separate draft; final results stay in component memory.
  const c = client(() => body(fixture()))
  const flow = workflow(c)
  await flow.confirm()
  assert.equal(flow.state.flow, 'success')
})
