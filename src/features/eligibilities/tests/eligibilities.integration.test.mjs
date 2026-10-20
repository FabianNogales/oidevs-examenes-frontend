import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const moduleDirectory = fileURLToPath(new URL('../', import.meta.url))
const sourceRoot = fileURLToPath(new URL('../../../', import.meta.url))

function compile(source) {
  return ts.transpileModule(source, {
    fileName: 'workflow.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
}

// Execute the actual API and its existing error helpers with only HTTP replaced.
// No network, browser, additional dependencies, or generated repository files.
function client(handlers = {}) {
  const calls = []
  const http = Object.fromEntries(['get', 'post', 'patch'].map((method) => [
    method, async (...args) => {
      calls.push({ method, args })
      if (!handlers[method]) throw new Error('Unexpected HTTP call')
      return handlers[method](...args)
    },
  ]))
  const cache = new Map()
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const localRequire = (specifier) => {
      if (specifier === '@/shared/api/httpClient') return { httpClient: http }
      if (specifier.startsWith('@/')) return load(resolve(sourceRoot, specifier.slice(2) + '.ts'))
      if (specifier.startsWith('.')) return load(resolve(dirname(filename), specifier + '.ts'))
      return require(specifier)
    }
    new Function('require', 'module', 'exports', compile(readFileSync(filename, 'utf8')))(
      localRequire, module, module.exports,
    )
    return module.exports
  }
  return { api: load(resolve(moduleDirectory, 'api/eligibilitiesApi.ts')), calls }
}

function findNode(filename, predicate) {
  const file = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true)
  let match
  function visit(node) {
    if (predicate(node)) match = node
    ts.forEachChild(node, visit)
  }
  visit(file)
  assert.ok(match, 'Expected existing workflow in source')
  return { node: match, file }
}

function processFile(api, list, notify) {
  const { node, file } = findNode(resolve(moduleDirectory, 'pages/ExamEligibilitiesPage.tsx'),
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'processFile')
  return new Function('bulkUpdateExamEligibilities', 'EligibilityApiError', 'getBulkEligibilityNotice',
    'list', 'notify', 'examId', compile(node.getText(file)) + '\nreturn processFile')(
    api.bulkUpdateExamEligibilities, api.EligibilityApiError, api.getBulkEligibilityNotice, list, notify, 17,
  )
}

// Exercise the real reload callback, which catches GET failures independently.
function listState(api, notify) {
  const list = { loading: false, error: null, items: [] }
  const { node, file } = findNode(resolve(moduleDirectory, 'hooks/useExamEligibilities.ts'),
    (node) => ts.isVariableDeclaration(node) && node.name.getText() === 'reload')
  const callback = node.initializer.arguments[0]
  const factory = compile('const reload = ' + callback.getText(file) + ';\n')
  list.reload = new Function('getExamEligibilities', 'notify', 'examId', 'mounted', 'request', 'setState',
    factory + '\nreturn reload')(
    api.getExamEligibilities, notify, 17, { current: true }, { current: null },
    (state) => Object.assign(list, state),
  )
  return list
}

const file = new Blob(['sis_code,status,reason_code,observations\n'], { type: 'text/csv' })
const signal = () => new AbortController().signal
const issue = (sis = '001234567') => ({ row: 3, sis_code: sis, messages: { row: ['Fila rechazada.'] } })
const partial = (sis) => ({ total_rows: 2, updated_rows: 1, failed_rows: 1, errors: [issue(sis)] })
const success = { total_rows: 2, updated_rows: 2, failed_rows: 0, errors: [] }
const body = (data) => ({ status: 200, data: { message: 'Carga de habilitaciones procesada.', data } })
const tick = () => new Promise((resolveTick) => setImmediate(resolveTick))
function httpError(status, data) {
  const { AxiosError } = require('axios')
  return new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', undefined, undefined, { status, data })
}

for (const [name, result] of [
  ['total success', success],
  ['partial with SIS and leading zeros', partial('001234567')],
  ['partial with null SIS', partial(null)],
  ['partial with empty SIS', partial('')],
  ['all rows rejected', { total_rows: 1, updated_rows: 0, failed_rows: 1, errors: [issue(null)] }],
]) {
  test('accepts ' + name + ' without coercion', async () => {
    const { api, calls } = client({ post: () => body(result) })
    assert.deepEqual(await api.bulkUpdateExamEligibilities(17, file, signal()), result)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].args[0], '/exams/17/eligibilities/bulk')
    assert.ok(calls[0].args[1] instanceof FormData)
  })
}

for (const [name, result] of [
  ['inconsistent total', { ...success, total_rows: 3 }],
  ['inconsistent failures', { ...partial(null), failed_rows: 0, total_rows: 1 }],
  ['negative count', { ...success, updated_rows: -1 }],
  ['fractional count', { ...success, total_rows: 2.5 }],
  ['string count', { ...success, updated_rows: '2' }],
  ['unsafe count', { ...success, total_rows: Number.MAX_SAFE_INTEGER + 1 }],
  ['numeric SIS', partial(123)],
  ['absent SIS', { ...partial(null), errors: [{ row: 3, messages: {} }] }],
  ['zero line', { ...partial(null), errors: [{ ...issue(), row: 0 }] }],
  ['array messages', { ...partial(null), errors: [{ ...issue(), messages: [] }] }],
  ['non-string message', { ...partial(null), errors: [{ ...issue(), messages: { row: [null] } }] }],
  ['absent errors', { total_rows: 2, updated_rows: 2, failed_rows: 0 }],
  ['null result', null],
]) {
  test('marks ' + name + ' as unknown and never retries', async () => {
    const { api, calls } = client({ post: () => body(result) })
    await assert.rejects(api.bulkUpdateExamEligibilities(17, file, signal()), (error) => {
      assert.equal(error.outcomeUnknown, true)
      assert.match(error.message, /Revisa las habilitaciones antes/)
      assert.equal(error.status, 200)
      return true
    })
    await tick()
    assert.equal(calls.length, 1)
  })
}

test('malformed response envelope is unknown', async () => {
  const { api } = client({ post: () => ({ status: 200, data: { data: success } }) })
  await assert.rejects(api.bulkUpdateExamEligibilities(17, file), (error) => error.outcomeUnknown === true)
})

test('HTTP 422 preserves the specific file validation message', async () => {
  const message = 'El archivo no contiene registros.'
  const { api, calls } = client({ post: () => { throw httpError(422, { message, errors: { file: [message] } }) } })
  await assert.rejects(api.bulkUpdateExamEligibilities(17, file), (error) => {
    assert.equal(error.outcomeUnknown, false)
    assert.equal(error.status, 422)
    assert.equal(error.fieldErrors.file, message)
    assert.equal(error.message, message)
    return true
  })
  assert.equal(calls.length, 1)
})

for (const [name, failure] of [
  ['lost communication', new Error('Network Error')],
  ['server failure', httpError(500, { message: 'Server Error' })],
]) {
  test(name + ' has unknown outcome and no automatic retry', async () => {
    const { api, calls } = client({ post: () => { throw failure } })
    await assert.rejects(api.bulkUpdateExamEligibilities(17, file), (error) => error.outcomeUnknown === true)
    await tick()
    assert.equal(calls.length, 1)
  })
}

test('notices distinguish total, partial, and no applied changes', () => {
  const { api } = client()
  assert.equal(api.getBulkEligibilityNotice(success).type, 'success')
  assert.equal(api.getBulkEligibilityNotice(partial(null)).type, 'info')
  assert.match(api.getBulkEligibilityNotice(partial(null)).message, /1 fila actualizada y 1 rechazada/)
  assert.match(api.getBulkEligibilityNotice({ ...partial(null), total_rows: 1, updated_rows: 0 }).message,
    /^No se aplicaron cambios/)
})

for (const failReload of [false, true]) {
  test('confirmed partial import survives ' + (failReload ? 'failed' : 'successful') + ' list reload', async () => {
    const item = { id: 1, sis_code: '001234567', status: 'INELIGIBLE', evaluated_by: 'docente@example.test', revision: 2 }
    const notices = []
    const notify = (type, message) => notices.push({ type, message })
    const { api, calls } = client({
      post: () => body(partial(null)),
      get: () => {
        if (failReload) throw new Error('GET unavailable')
        return { data: { data: [item] } }
      },
    })
    const list = listState(api, notify)
    const result = await processFile(api, list, notify)(file, signal())
    await tick()
    assert.deepEqual(result, partial(null))
    assert.equal(calls.filter((call) => call.method === 'post').length, 1)
    assert.equal(calls.filter((call) => call.method === 'get').length, 1)
    assert.equal(list.loading, false)
    assert.equal(notices[0].type, 'info')
    assert.match(notices[0].message, /^Carga parcial/)
    if (failReload) {
      assert.match(list.error, /No se pudieron cargar las habilitaciones/)
      assert.equal(notices[1].type, 'error')
      assert.doesNotMatch(notices[1].message, /procesar el archivo/)
    } else {
      assert.equal(list.error, null)
      assert.equal(list.items[0].evaluated_by, 'docente@example.test')
    }
  })
}

test('all rejected rows do not trigger a reload or success notice', async () => {
  const result = { total_rows: 1, updated_rows: 0, failed_rows: 1, errors: [issue(null)] }
  const { api, calls } = client({ post: () => body(result) })
  const notices = []
  await processFile(api, { reload: () => assert.fail('Unexpected reload') },
    (...notice) => notices.push(notice))(file, signal())
  assert.equal(calls.length, 1)
  assert.equal(notices[0][0], 'info')
  assert.match(notices[0][1], /^No se aplicaron cambios/)
})

test('unknown outcome stays unknown in page workflow', async () => {
  const { api, calls } = client({ post: () => body({ ...success, total_rows: 99 }) })
  const notices = []
  await assert.rejects(processFile(api, { reload: () => assert.fail('No implicit reload or retry') },
    (...notice) => notices.push(notice))(file, signal()), (error) => error.outcomeUnknown === true)
  assert.equal(notices[0][0], 'info')
  assert.equal(calls.length, 1)
})

test('list preserves evaluator and revision; individual PATCH sends the original revision', async () => {
  const rows = [{ evaluated_by: 'docente@example.test', revision: 3 }, { evaluated_by: null, revision: 1 }]
  const { api, calls } = client({ get: () => ({ data: { data: rows } }), patch: () => ({ status: 200 }) })
  assert.deepEqual((await api.getExamEligibilities(17)).map((item) => item.evaluated_by),
    ['docente@example.test', null])
  const abortSignal = signal()
  await api.updateExamEligibility(17, 23, { status: 'ELIGIBLE', revision: 3 }, abortSignal)
  assert.equal(calls[1].args[0], '/exams/17/eligibilities/23')
  assert.deepEqual(calls[1].args[1], { status: 'ELIGIBLE', revision: 3 })
  assert.equal(calls[1].args[2].signal, abortSignal)
})

function saveOne(api, list, notify, setSelected) {
  const { node, file } = findNode(resolve(moduleDirectory, 'pages/ExamEligibilitiesPage.tsx'),
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'save')
  return new Function('updateExamEligibility', 'EligibilityApiError', 'list', 'notify', 'examId', 'setSelected',
    compile(node.getText(file)) + '\nreturn save')(
    api.updateExamEligibility, api.EligibilityApiError, list, notify, 17, setSelected,
  )
}

// Execute the actual TSX component, handlers and rendered element tree with a tiny
// hook host. This checks workflow behavior, not browser layout or React DOM integration.
function modal(api, eligibility, onSave) {
  const slots = []
  let cursor = 0
  const hooks = {
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = initial
      return [slots[index], (next) => { slots[index] = next }]
    },
    useRef(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = { current: initial }
      return slots[index]
    },
    useId: () => 'modal-id',
    useEffect: () => {},
  }
  const module = { exports: {} }
  const dependencies = {
    react: hooks,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@/features/auth/components/AuthIcons': { InfoCircleIcon: 'info-icon', UserIcon: 'user-icon' },
    '@/features/collaborations/components/CollaborationModal': { CollaborationModal: 'modal' },
    '../api/eligibilitiesApi': api,
    '../hooks/useEligibilityReasons': { useEligibilityReasons: () => ({
      items: [{ code: 'OTHER', label: 'Otro motivo' }], loading: false, error: null,
    }) },
    '../utils/eligibilityDisplay': { getEligibilityStudentName: () => 'Alumno Prueba' },
  }
  const source = readFileSync(resolve(moduleDirectory, 'components/ManageEligibilityModal.tsx'), 'utf8')
  new Function('require', 'module', 'exports', compile(source))((specifier) => {
    if (specifier.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => String(key) }) }
    assert.ok(specifier in dependencies, 'Unexpected modal dependency: ' + specifier)
    return dependencies[specifier]
  }, module, module.exports)
  const props = { examId: 17, eligibility, onSave, onClose: () => {} }
  let tree
  function nodes(node) {
    if (node === null || node === undefined || typeof node === 'boolean') return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...(node.props ? nodes(node.props.children) : [])]
  }
  function textOf(node) {
    return nodes(node).filter((item) => typeof item === 'string' || typeof item === 'number').join(' ').replace(/\s+/g, ' ').trim()
  }
  return {
    render() { cursor = 0; tree = module.exports.ManageEligibilityModal(props); return tree },
    find(type) { return nodes(tree).find((node) => node.type === type) },
    button(label) { return nodes(tree).find((node) => node.type === 'button' && textOf(node).trim() === label) },
    text() { return textOf(tree) },
    alerts() { return nodes(tree).filter((node) => node.props?.role === 'alert').map(textOf) },
  }
}

const original = {
  id: 11, student_id: 23, status: 'INELIGIBLE', revision: 3, reason_code: 'OTHER',
  reason: 'Otro motivo', observations: 'Borrador original', evaluated_by: 'docente@example.test',
  evaluated_at: '2026-10-20T13:00:00+00:00', profile_photo_url: null,
}

test('modal success sends its revision and preserves the existing close/notice/reload workflow', async () => {
  const { api, calls } = client({ patch: () => ({ status: 200, data: { data: { revision: 4 } } }) })
  const notices = []
  const closed = []
  let reloads = 0
  const ui = modal(api, original, saveOne(api, { reload: () => { reloads++ } },
    (...args) => notices.push(args), (value) => closed.push(value)))
  ui.render()
  ui.find('textarea').props.onChange({ target: { value: 'Decisión nueva' } })
  ui.render()
  ui.find('form').props.onSubmit({ preventDefault() {} })
  await tick()
  assert.deepEqual(calls[0].args[1], { status: 'INELIGIBLE', reason_code: 'OTHER', observations: 'Decisión nueva', revision: 3 })
  assert.deepEqual(closed, [null])
  assert.equal(notices.length, 1)
  assert.equal(notices[0][0], 'success')
  assert.equal(reloads, 1)
})

for (const source of ['another tab', 'CSV update']) {
  test('conflict after ' + source + ' preserves draft until explicit server review and discard', async () => {
    const current = { ...original, revision: 4, observations: 'Última decisión del servidor' }
    let conflict = true
    const { api, calls } = client({
      patch: () => {
        if (conflict) throw httpError(409, { code: 'ELIGIBILITY_CONFLICT' })
        return { status: 200 }
      },
      get: () => ({ data: { data: [current] } }),
    })
    const notices = []
    const closed = []
    let reloads = 0
    const ui = modal(api, original, saveOne(api, { reload: () => { reloads++ } },
      (...args) => notices.push(args), (value) => closed.push(value)))
    ui.render()
    ui.find('textarea').props.onChange({ target: { value: 'Mi borrador sin guardar' } })
    ui.render()
    ui.find('form').props.onSubmit({ preventDefault() {} })
    await tick()
    ui.render()
    assert.equal(closed.length, 0)
    assert.equal(notices.length, 0)
    assert.equal(reloads, 0)
    assert.match(ui.alerts().join(' '), /fue modificada mientras la estabas editando/)
    assert.equal(ui.find('textarea').props.value, 'Mi borrador sin guardar')
    assert.equal(ui.button('Guardar').props.disabled, true)
    ui.find('form').props.onSubmit({ preventDefault() {} })
    await tick()
    assert.equal(calls.length, 1, 'No automatic read, retry, or PATCH while conflicted')

    ui.button('Consultar datos actuales').props.onClick()
    await tick()
    ui.render()
    assert.equal(calls.length, 2)
    assert.equal(calls[1].method, 'get')
    assert.equal(calls[1].args[0], '/exams/17/eligibilities')
    assert.match(ui.text(), /Revisión del formulario: 3/)
    assert.match(ui.text(), /Datos actuales del servidor — Revisión 4/)
    assert.equal(ui.find('textarea').props.value, 'Mi borrador sin guardar')
    assert.equal(ui.button('Guardar').props.disabled, true)

    ui.button('Descartar borrador y cargar estos datos').props.onClick()
    ui.render()
    assert.equal(ui.find('textarea').props.value, current.observations)
    assert.match(ui.text(), /Revisión del formulario: 4/)
    assert.deepEqual(ui.alerts(), [])
    assert.equal(ui.button('Guardar').props.disabled, true, 'No change after replacing the whole snapshot')
    ui.find('textarea').props.onChange({ target: { value: 'Decisión revisada' } })
    ui.render()
    conflict = false
    ui.find('form').props.onSubmit({ preventDefault() {} })
    await tick()
    assert.equal(calls.length, 3)
    assert.equal(calls[2].args[1].revision, 4)
    assert.equal(calls[2].args[1].observations, 'Decisión revisada')
    assert.deepEqual(closed, [null])
    assert.equal(notices[0][0], 'success')
  })
}

for (const revision of [undefined, null, 0, -1, 1.5, '1']) {
  test('GET refuses an unusable revision: ' + revision, async () => {
    const { api } = client({ get: () => ({ data: { data: [{ ...original, revision }] } }) })
    await assert.rejects(api.getExamEligibilities(17), /No se pudieron cargar las habilitaciones/)
  })
}

test('failed explicit refresh preserves the conflicted draft and its original revision', async () => {
  const { api, calls } = client({
    patch: () => { throw httpError(409, { code: 'ELIGIBILITY_CONFLICT' }) },
    get: () => { throw httpError(403, {}) },
  })
  const ui = modal(api, original, api.updateExamEligibility.bind(null, 17))
  ui.render()
  ui.find('textarea').props.onChange({ target: { value: 'Conservar borrador' } })
  ui.render()
  ui.find('form').props.onSubmit({ preventDefault() {} })
  await tick()
  ui.render()
  ui.button('Consultar datos actuales').props.onClick()
  await tick()
  ui.render()
  assert.equal(ui.find('textarea').props.value, 'Conservar borrador')
  assert.match(ui.text(), /Revisión del formulario: 3/)
  assert.equal(ui.button('Descartar borrador y cargar estos datos'), undefined)
  assert.equal(ui.button('Guardar').props.disabled, true)
  assert.equal(calls.length, 2)
})
