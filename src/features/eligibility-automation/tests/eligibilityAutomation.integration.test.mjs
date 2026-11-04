import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const featureRoot = fileURLToPath(new URL('../', import.meta.url))
const sourceRoot = fileURLToPath(new URL('../../../', import.meta.url))

function compile(source) {
  return ts.transpileModule(source, {
    fileName: 'workflow.ts',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
}

function createHarness(handlers = {}) {
  const calls = []
  const http = Object.fromEntries(['get', 'post', 'put', 'patch'].map((method) => [
    method,
    async (...args) => {
      calls.push({ method, args })
      if (!handlers[method]) throw new Error(`Unexpected ${method.toUpperCase()} call`)
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
      localRequire,
      module,
      module.exports,
    )
    return module.exports
  }
  return {
    api: load(resolve(featureRoot, 'api/eligibilityAutomationApi.ts')),
    calls,
  }
}

const response = (data) => ({ status: 200, data })
const options = {
  exam_id: 17,
  evaluation_type: 'makeup',
  configured_evaluation_type: 'makeup',
  revision: 3,
  combination: 'ALL',
  policy: { id: 2, version: 4 },
  selected_criteria: [],
  mandatory_criteria: [{ code: 'SECOND_INSTANCE_PARTIAL_AVERAGE', parameters: {}, required: true, locked: true }],
  criteria: [{
    code: 'SECOND_INSTANCE_PARTIAL_AVERAGE',
    label: 'Promedio de parciales',
    required: true,
    locked: true,
    parameters: {},
    operator: 'GT',
    threshold: 25,
  }],
  assessments: [{ key: 'FIRST_PARTIAL', label: 'Primer parcial' }],
}

function httpError(status, data) {
  const { AxiosError } = require('axios')
  return new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', undefined, undefined, { status, data })
}

test('fetches backend catalog and current configuration without synthesizing criteria', async () => {
  const { api, calls } = createHarness({
    get: (path) => response({ data: path.endsWith('/options') ? options : { ...options, criteria: [] } }),
  })
  assert.deepEqual(await api.getAutomationOptions(17), options)
  assert.deepEqual(await api.getAutomationConfiguration(17), { ...options, criteria: [] })
  assert.equal(calls[0].args[0], '/exams/17/eligibility-automation/options')
  assert.equal(calls[1].args[0], '/exams/17/eligibility-automation/configuration')
})

test('configuration PUT sends only editable optional criteria and current revision', async () => {
  const { api, calls } = createHarness({ put: (_path, payload) => response({ data: { ...options, revision: 4, selected_criteria: payload.criteria } }) })
  const criteria = [{ code: 'MIN_ATTENDANCE_PERCENTAGE', parameters: { minimum_percentage: 85 } }]
  const saved = await api.saveAutomationConfiguration(17, { revision: 3, criteria })
  assert.equal(calls[0].args[0], '/exams/17/eligibility-automation/configuration')
  assert.deepEqual(calls[0].args[1], { revision: 3, criteria })
  assert.equal(saved.revision, 4)
  assert.equal(JSON.stringify(calls[0].args[1]).includes('SECOND_INSTANCE_PARTIAL_AVERAGE'), false)
})

test('criterion conflict keeps CRITERIA_CONFLICT and errors per criterion', async () => {
  const message = 'El promedio está definido por el criterio obligatorio.'
  const { api } = createHarness({
    put: () => { throw httpError(422, { code: 'CRITERIA_CONFLICT', message, errors: { 'criteria.0': [message] } }) },
  })
  await assert.rejects(api.saveAutomationConfiguration(17, {
    revision: 2,
    criteria: [{ code: 'MIN_ASSESSMENT_AVERAGE', parameters: {} }],
  }), (error) => {
    assert.equal(error.status, 422)
    assert.equal(error.code, 'CRITERIA_CONFLICT')
    assert.equal(error.fieldErrors['criteria.0'], message)
    return true
  })
})

test('409 configuration conflicts are preserved for explicit reload UX', async () => {
  const { api } = createHarness({
    put: () => { throw httpError(409, { code: 'AUTOMATION_CONFLICT', message: 'La configuración cambió.' }) },
  })
  await assert.rejects(api.saveAutomationConfiguration(17, { revision: 2, criteria: [] }), (error) => error.status === 409)
})

test('CSV schema, multipart preview, and explicit confirmation use separate endpoints', async () => {
  const schema = { columns: ['sis', 'assessment_key'], max_rows: 1000 }
  const preview = { preview_id: 'preview-1', can_confirm: true, total_rows: 1, valid_records: [], errors: [] }
  const result = { preview_id: 'preview-1', created_records: 1, record_ids: [5] }
  const { api, calls } = createHarness({
    get: () => response({ data: schema }),
    post: (path, body) => path.endsWith('/preview') ? response({ data: preview }) : response({ data: result }),
  })
  const file = new Blob(['sis,assessment_key\\n'], { type: 'text/csv' })
  assert.deepEqual(await api.getImportSchema(8), schema)
  assert.deepEqual(await api.previewAcademicImport(8, file), preview)
  assert.deepEqual(await api.confirmAcademicImport(8, 'preview-1'), result)
  assert.equal(calls[0].args[0], '/academic-offerings/8/academic-records/import-schema')
  assert.equal(calls[1].args[0], '/academic-offerings/8/academic-records/imports/preview')
  assert.ok(calls[1].args[1] instanceof FormData)
  assert.equal(await calls[1].args[1].get('file').text(), 'sis,assessment_key\\n')
  assert.equal(calls[2].args[0], '/academic-offerings/8/academic-records/imports/preview-1/confirm')
})

test('CSV preview validation errors are returned without creating a success result', async () => {
  const { api } = createHarness({
    post: () => { throw httpError(422, { message: 'Encabezado requerido.', errors: { file: ['Encabezado requerido.'] } }) },
  })
  await assert.rejects(api.previewAcademicImport(8, new Blob(['bad header'])), (error) => {
    assert.equal(error.status, 422)
    assert.equal(error.fieldErrors.file, 'Encabezado requerido.')
    return true
  })
})

test('academic records preserve absent scores and correction payload includes revision and reason', async () => {
  const records = {
    data: [{
      id: 12,
      sis_code: '202600001',
      assessments: { FIRST_PARTIAL: { was_taken: true, score: null } },
      attended_classes: null,
      total_classes: null,
      revision: 1,
    }],
    meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
  }
  const corrected = { ...records.data[0], revision: 2 }
  const { api, calls } = createHarness({
    get: () => response(records),
    patch: (_path, payload) => response({ data: { ...corrected, ...payload } }),
  })
  const page = await api.getAcademicRecords(8)
  assert.equal(page.data[0].assessments.FIRST_PARTIAL.score, null)
  assert.equal(page.data[0].attended_classes, null)
  await api.correctAcademicRecord(8, 12, {
    revision: 1,
    reason: 'Corrección de acta',
    assessments: { FIRST_PARTIAL: { was_taken: true, score: null } },
    attended_classes: null,
    total_classes: null,
  })
  assert.equal(calls[0].args[0], '/academic-offerings/8/academic-records')
  assert.equal(calls[1].args[0], '/academic-offerings/8/academic-records/12')
  assert.equal(calls[1].args[1].reason, 'Corrección de acta')
  assert.equal(calls[1].args[1].revision, 1)
})

test('correction 422 reports field errors and 409 remains a conflict', async () => {
  const { api } = createHarness({
    patch: () => { throw httpError(422, { message: 'Revisa la nota.', errors: { 'assessments.FIRST_PARTIAL.score': ['Nota inválida.'] } }) },
  })
  await assert.rejects(api.correctAcademicRecord(8, 12, {
    revision: 1, reason: 'Motivo', assessments: {}, attended_classes: null, total_classes: null,
  }), (error) => error.status === 422 && error.fieldErrors['assessments.FIRST_PARTIAL.score'] === 'Nota inválida.')
  const conflictHarness = createHarness({
    patch: () => { throw httpError(409, { message: 'Los datos académicos cambiaron.' }) },
  })
  await assert.rejects(conflictHarness.api.correctAcademicRecord(8, 12, {
    revision: 1, reason: 'Motivo', assessments: {}, attended_classes: null, total_classes: null,
  }), (error) => error.status === 409)
})

test('evaluation preview preserves manual and non-override statuses from backend', async () => {
  const view = {
    id: 31,
    preview_id: 'snapshot-31',
    results: [{
      student: { id: 5, display_name: 'Estudiante', sis: '202600001' },
      computed_status: 'ELIGIBLE',
      current_status: 'INELIGIBLE',
      effective_status: 'INELIGIBLE',
      manual_override_preserved: true,
      will_update: false,
      reason: 'Se conserva la decisión manual vigente.',
      missing_fields: [],
      eligibility_revision: 4,
      policy: { id: 2, version: 4 },
      criteria_results: [{ code: 'MIN_ASSESSMENT_SCORE', status: 'PASSED', actual_value: 75, required_value: 60 }],
    }, {
      student: { id: 6, display_name: 'Sin override', sis: '202600002' },
      computed_status: 'INELIGIBLE',
      current_status: null,
      effective_status: 'INELIGIBLE',
      manual_override_preserved: false,
      will_update: true,
      reason: 'Resultado calculado.',
      missing_fields: [],
      eligibility_revision: null,
      policy: { id: 2, version: 4 },
      criteria_results: [],
    }],
    meta: { current_page: 1, per_page: 100, total: 2, last_page: 1 },
    summary: { total: 2, eligible: 1, ineligible: 1, pending: 0 },
  }
  const { api, calls } = createHarness({ post: () => response({ data: view }) })
  const actual = await api.previewEligibilityEvaluation(17, 3)
  assert.equal(calls[0].args[0], '/exams/17/eligibility-automation/evaluations/preview')
  assert.deepEqual(calls[0].args[1], { configuration_revision: 3 })
  assert.equal(actual.results[0].computed_status, 'ELIGIBLE')
  assert.equal(actual.results[0].current_status, 'INELIGIBLE')
  assert.equal(actual.results[0].manual_override_preserved, true)
  assert.equal(actual.results[0].effective_status, 'INELIGIBLE')
  assert.equal(actual.results[0].will_update, false)
  assert.equal(actual.results[0].criteria_results[0].status, 'PASSED')
  assert.equal(actual.results[1].manual_override_preserved, false)
  assert.equal(actual.results[1].effective_status, actual.results[1].computed_status)
})

test('evaluation result pagination loads every backend snapshot page for confirmation summary', async () => {
  const first = {
    id: 31,
    results: [{ student: { id: 1 } }],
    meta: { current_page: 1, per_page: 100, total: 101, last_page: 2 },
  }
  const second = { data: { id: 31, results: [{ student: { id: 2 } }], meta: { current_page: 2, per_page: 100, total: 101, last_page: 2 } } }
  const { api, calls } = createHarness({ get: () => response(second) })
  const complete = await api.getAllEvaluationResults(17, first)
  assert.deepEqual(complete.results.map((item) => item.student.id), [1, 2])
  assert.equal(calls[0].args[0], '/exams/17/eligibility-automation/evaluations/31')
  assert.deepEqual(calls[0].args[1].params, { page: 2, per_page: 100 })
})

test('confirmation refreshes HU12 only after backend confirmation succeeds', async () => {
  const hu12 = [{ id: 9, revision: 2, status: 'ELIGIBLE', sis_code: '202600001' }]
  const result = { evaluation_id: 31, updated: 1, unchanged: 0, manual_preserved: 0, pending: 0 }
  const { api, calls } = createHarness({
    post: () => response({ data: result }),
    get: (path) => path === '/exams/17/eligibilities'
      ? response({ data: hu12 })
      : response({ data: { data: [] } }),
  })
  const outcome = await api.confirmEvaluationAndReloadHu12(17, 'snapshot-31')
  assert.deepEqual(outcome.confirmation, result)
  assert.deepEqual(outcome.eligibilities, [{
    ...hu12[0],
    reason_code: null,
    reason: null,
    observations: null,
  }])
  assert.equal(outcome.refreshError, null)
  assert.equal(calls[0].args[0], '/exams/17/eligibility-automation/evaluations/snapshot-31/confirm')
  assert.equal(calls[1].args[0], '/exams/17/eligibilities')
})

test('evaluation 409 blocks local confirmation and preserves error status', async () => {
  const { api } = createHarness({
    post: () => { throw httpError(409, { code: 'AUTOMATION_CONFLICT', message: 'Genera otro preview.' }) },
  })
  await assert.rejects(api.confirmEligibilityEvaluation(17, 'snapshot-31'), (error) => error.status === 409)
})

test('consults both academic and evaluation histories and persisted detail', async () => {
  const paged = { data: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 } }
  const detail = { id: 31, preview_id: 'snapshot-31', results: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 } }
  const { api, calls } = createHarness({
    get: (path) => {
      if (path.endsWith('/history')) return response(paged)
      if (path.includes('/evaluations/31')) return response({ data: detail })
      return response(paged)
    },
  })
  assert.deepEqual(await api.getAcademicHistory(8), paged)
  assert.deepEqual(await api.getEvaluationHistory(17), paged)
  assert.deepEqual(await api.getEvaluationDetail(17, 31), detail)
  assert.equal(calls[0].args[0], '/academic-offerings/8/academic-records/history')
  assert.equal(calls[1].args[0], '/exams/17/eligibility-automation/evaluations')
  assert.equal(calls[2].args[0], '/exams/17/eligibility-automation/evaluations/31')
})

test('admin policy list/create/version/edit/activate use only versioned admin endpoints', async () => {
  const policy = { id: 2, version: 1, name: 'Policy', status: 'DRAFT', revision: 1 }
  const { api, calls } = createHarness({
    get: (path) => path === '/admin/eligibility-policies'
      ? response({ data: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 } })
      : response({ data: policy }),
    post: () => response({ data: policy }),
    patch: () => response({ data: policy }),
  })
  await api.getEligibilityPolicies()
  await api.createEligibilityPolicy({ name: 'Nueva' })
  await api.createEligibilityPolicyVersion(2, { name: 'Versión 2', definition: {} })
  await api.updateEligibilityPolicy(policy, { name: 'Actualizada' })
  await api.activateEligibilityPolicy(policy)
  assert.deepEqual(calls.map((call) => call.args[0]), [
    '/admin/eligibility-policies',
    '/admin/eligibility-policies',
    '/admin/eligibility-policies/2/versions',
    '/admin/eligibility-policies/2',
    '/admin/eligibility-policies/2/activate',
  ])
  assert.deepEqual(calls[3].args[1], { revision: 1, name: 'Actualizada' })
  assert.deepEqual(calls[4].args[1], { revision: 1 })
})

test('frontend role gates exclude collaborators and expose manual/pending safeguards', () => {
  const router = readFileSync(resolve(sourceRoot, 'app/router/router.tsx'), 'utf8')
  const page = readFileSync(resolve(featureRoot, 'pages/EligibilityAutomationPage.tsx'), 'utf8')
  assert.match(router, /ProtectedRoute allowedRoles=\{\['DOCENTE'\]\}/)
  assert.match(router, /ProtectedRoute allowedRoles=\{\['ADMINISTRADOR'\]\}/)
  assert.match(router, /teacher\/exams\/:examId\/eligibilities\/automatic/)
  assert.match(router, /path: 'eligibility-policies'/)
  assert.match(page, /Se conserva la decisión manual vigente/)
  assert.match(page, /Pendiente por información insuficiente/)
  assert.match(page, /Estado efectivo/)
  assert.match(page, /disabled=\{locked\}/)
  assert.match(page, /<fieldset/)
  assert.match(page, /schema\.type === 'array'/)
  assert.match(page, /schema\.max/)
})

test('academic records omit empty search and serialize a nonempty string without changing it', async () => {
  const { api, calls } = createHarness({ get: () => response({ data: [], meta: {} }) })
  for (const search of ['', '   ', 'Primer parcial', ' 202600001 ']) await api.getAcademicRecords(8, 1, search)
  assert.deepEqual(calls[0].args[1].params, { page: 1, per_page: 10 })
  assert.deepEqual(calls[1].args[1].params, { page: 1, per_page: 10 })
  assert.equal(calls[2].args[1].params.search, 'Primer parcial')
  assert.equal(calls[3].args[1].params.search, ' 202600001 ')
  const axios = require('axios').default
  assert.equal(axios.getUri({ url: calls[0].args[0], params: calls[0].args[1].params }), '/academic-offerings/8/academic-records?page=1&per_page=10')
})
