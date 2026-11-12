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
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText
}

function createHarness(handlers = {}) {
  const calls = []
  const http = Object.fromEntries(
    ['get', 'post', 'put', 'patch'].map((method) => [
      method,
      async (...args) => {
        calls.push({ method, args })
        if (!handlers[method])
          throw new Error(`Unexpected ${method.toUpperCase()} call`)
        return handlers[method](...args)
      },
    ]),
  )
  const cache = new Map()
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const localRequire = (specifier) => {
      if (specifier === '@/shared/api/httpClient') return { httpClient: http }
      if (specifier.startsWith('@/'))
        return load(resolve(sourceRoot, specifier.slice(2) + '.ts'))
      if (specifier.startsWith('.'))
        return load(resolve(dirname(filename), specifier + '.ts'))
      return require(specifier)
    }
    new Function(
      'require',
      'module',
      'exports',
      compile(readFileSync(filename, 'utf8')),
    )(localRequire, module, module.exports)
    return module.exports
  }
  return {
    api: load(resolve(featureRoot, 'api/eligibilityAutomationApi.ts')),
    calls,
    load,
  }
}

const response = (data) => ({ status: 200, data })
const options = {
  exam_id: 17,
  evaluation_type: 'makeup',
  configured_evaluation_type: 'makeup',
  revision: 3,
  catalog_revision: 'catalog-opaque-value',
  combination: 'ALL',
  selected_criteria: [],
  mandatory_criteria: [
    {
      code: 'SECOND_INSTANCE_PARTIAL_AVERAGE',
      name: 'Promedio de parciales para segunda instancia',
      parameters: {
        assessment_keys: ['FIRST_PARTIAL', 'SECOND_PARTIAL'],
        operator: 'GT',
        threshold: 25,
      },
      required: true,
      locked: true,
    },
  ],
  inactive_criteria: [],
  criteria: [
    {
      code: 'SECOND_INSTANCE_PARTIAL_AVERAGE',
      name: 'Promedio de parciales para segunda instancia',
      description: null,
      status: 'ACTIVE',
      revision: 1,
      parameters: [],
      mandatory_for_exam_types: ['makeup'],
      fixed_parameters: {
        assessment_keys: ['FIRST_PARTIAL', 'SECOND_PARTIAL'],
        operator: 'GT',
        threshold: 25,
      },
      required: true,
      locked: true,
    },
    {
      code: 'MIN_ATTENDANCE_PERCENTAGE',
      name: 'Porcentaje mínimo de asistencia',
      description: null,
      status: 'ACTIVE',
      revision: 1,
      parameters: [
        {
          key: 'minimum_percentage',
          type: 'number',
          required: true,
          minimum_exclusive: 0,
          maximum: 100,
        },
      ],
      mandatory_for_exam_types: [],
      fixed_parameters: null,
      label: 'Porcentaje mínimo de asistencia',
      required: false,
      locked: false,
    },
  ],
  assessments: [
    { key: 'FIRST_PARTIAL', label: 'Primer parcial' },
    { key: 'SECOND_PARTIAL', label: 'Segundo parcial' },
  ],
  manual_review_conditions: null,
}

function httpError(status, data) {
  const { AxiosError } = require('axios')
  return new AxiosError(
    'HTTP failure',
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    { status, data },
  )
}

test('fetches current configuration and normalizes backend catalog parameter schemas', async () => {
  const { api, calls } = createHarness({
    get: (path) =>
      response({
        data: path.endsWith('/options')
          ? options
          : { ...options, criteria: [] },
      }),
  })
  const actualOptions = await api.getAutomationOptions(17)
  assert.equal(actualOptions.catalog_revision, 'catalog-opaque-value')
  assert.deepEqual(actualOptions.criteria[1].parameters, {
    minimum_percentage: {
      type: 'number',
      required: true,
      minimum_exclusive: 0,
      maximum: 100,
    },
  })
  assert.equal(
    actualOptions.criteria[0].label,
    'Promedio de parciales para segunda instancia',
  )
  assert.equal(actualOptions.criteria[0].operator, 'GT')
  assert.equal(actualOptions.criteria[0].threshold, 25)
  assert.deepEqual(await api.getAutomationConfiguration(17), {
    ...options,
    criteria: [],
  })
  assert.equal(calls[0].args[0], '/exams/17/eligibility-automation/options')
  assert.equal(
    calls[1].args[0],
    '/exams/17/eligibility-automation/configuration',
  )
})

test('configuration PUT sends selected optional criteria with both revisions and manual notes', async () => {
  const { api, calls } = createHarness({
    put: (_path, payload) =>
      response({
        data: { ...options, revision: 4, selected_criteria: payload.criteria },
      }),
  })
  const criteria = [
    {
      code: 'MIN_ATTENDANCE_PERCENTAGE',
      parameters: { minimum_percentage: 85 },
    },
  ]
  const saved = await api.saveAutomationConfiguration(17, {
    revision: 3,
    catalog_revision: 'catalog-opaque-value',
    criteria,
    manual_review_conditions: 'Revisar el proyecto práctico.',
  })
  assert.equal(
    calls[0].args[0],
    '/exams/17/eligibility-automation/configuration',
  )
  assert.deepEqual(calls[0].args[1], {
    revision: 3,
    catalog_revision: 'catalog-opaque-value',
    criteria,
    manual_review_conditions: 'Revisar el proyecto práctico.',
  })
  assert.equal(saved.revision, 4)
  assert.equal(
    JSON.stringify(calls[0].args[1]).includes(
      'SECOND_INSTANCE_PARTIAL_AVERAGE',
    ),
    false,
  )
})

test('criterion conflict keeps CRITERIA_CONFLICT and errors per criterion', async () => {
  const message = 'El promedio está definido por el criterio obligatorio.'
  const { api } = createHarness({
    put: () => {
      throw httpError(422, {
        code: 'CRITERIA_CONFLICT',
        message,
        errors: { 'criteria.0': [message] },
      })
    },
  })
  await assert.rejects(
    api.saveAutomationConfiguration(17, {
      revision: 2,
      catalog_revision: 'catalog-opaque-value',
      criteria: [{ code: 'MIN_ASSESSMENT_AVERAGE', parameters: {} }],
      manual_review_conditions: null,
    }),
    (error) => {
      assert.equal(error.status, 422)
      assert.equal(error.code, 'CRITERIA_CONFLICT')
      assert.equal(error.fieldErrors['criteria.0'], message)
      return true
    },
  )
})

test('409 configuration conflicts are preserved for explicit reload UX', async () => {
  const { api } = createHarness({
    put: () => {
      throw httpError(409, {
        code: 'AUTOMATION_CONFLICT',
        message: 'La configuración cambió.',
      })
    },
  })
  await assert.rejects(
    api.saveAutomationConfiguration(17, {
      revision: 2,
      catalog_revision: 'catalog-opaque-value',
      criteria: [],
      manual_review_conditions: null,
    }),
    (error) => error.status === 409,
  )
})

test('CSV schema, multipart preview, and explicit confirmation use separate endpoints', async () => {
  const schema = { columns: ['sis', 'assessment_key'], max_rows: 1000 }
  const preview = {
    preview_id: 'preview-1',
    can_confirm: true,
    total_rows: 1,
    valid_records: [],
    errors: [],
  }
  const result = {
    preview_id: 'preview-1',
    created_records: 1,
    record_ids: [5],
  }
  const { api, calls } = createHarness({
    get: () => response({ data: schema }),
    post: (path, body) =>
      path.endsWith('/preview')
        ? response({ data: preview })
        : response({ data: result }),
  })
  const file = new Blob(['sis,assessment_key\\n'], { type: 'text/csv' })
  assert.deepEqual(await api.getImportSchema(8), schema)
  assert.deepEqual(await api.previewAcademicImport(8, file), preview)
  assert.deepEqual(await api.confirmAcademicImport(8, 'preview-1'), result)
  assert.equal(
    calls[0].args[0],
    '/academic-offerings/8/academic-records/import-schema',
  )
  assert.equal(
    calls[1].args[0],
    '/academic-offerings/8/academic-records/imports/preview',
  )
  assert.ok(calls[1].args[1] instanceof FormData)
  assert.equal(
    await calls[1].args[1].get('file').text(),
    'sis,assessment_key\\n',
  )
  assert.equal(
    calls[2].args[0],
    '/academic-offerings/8/academic-records/imports/preview-1/confirm',
  )
})

test('CSV preview validation errors are returned without creating a success result', async () => {
  const { api } = createHarness({
    post: () => {
      throw httpError(422, {
        message: 'Encabezado requerido.',
        errors: { file: ['Encabezado requerido.'] },
      })
    },
  })
  await assert.rejects(
    api.previewAcademicImport(8, new Blob(['bad header'])),
    (error) => {
      assert.equal(error.status, 422)
      assert.equal(error.fieldErrors.file, 'Encabezado requerido.')
      return true
    },
  )
})

test('academic CSV template is empty and uses only teacher-facing columns', () => {
  const { load } = createHarness()
  const csv = load(resolve(featureRoot, 'utils/academicCsv.ts'))
  const lines = csv.getAcademicCsvTemplate().trim().split(/\r?\n/)
  assert.equal(
    lines[0],
    'sis,nombre_completo,nota_pp,nota_sp,asistencias,total_clases',
  )
  assert.equal(lines.length, 1)
  assert.doesNotMatch(csv.getAcademicCsvTemplate(), /2026|Juan|Maria|Carlos/)
  assert.doesNotMatch(lines[0], /assessment_key|was_taken|score/)
})

test('valid academic CSV validates teacher fields and adapts to the current backend contract', async () => {
  const { load } = createHarness()
  const csv = load(resolve(featureRoot, 'utils/academicCsv.ts'))
  const schema = {
    columns: [
      'sis',
      'assessment_key',
      'was_taken',
      'score',
      'attended_classes',
      'total_classes',
    ],
    assessment_keys: ['FIRST_PARTIAL', 'SECOND_PARTIAL'],
    encoding: 'UTF-8',
    delimiter: ',',
    max_rows: 1000,
    max_file_kb: 5120,
    score_min: 0,
    score_max: 100,
    score_decimal_places: 2,
    was_taken_values: ['true', 'false'],
  }
  const content = [
    'sis,nombre_completo,nota_pp,nota_sp,asistencias,total_clases',
    '202600001,"Juan ""P"" Perez",28,32,18,20',
    '',
  ].join('\r\n')
  const bytes = new TextEncoder().encode(content)
  const file = {
    name: 'datos.csv',
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  }
  const prepared = await csv.prepareAcademicCsv(file, schema)
  assert.equal(prepared.rows[0].nombre_completo, 'Juan "P" Perez')
  assert.deepEqual(prepared.csv.trim().split(/\r?\n/), [
    'sis,assessment_key,was_taken,score,attended_classes,total_classes',
    '202600001,FIRST_PARTIAL,true,28,18,20',
    '202600001,SECOND_PARTIAL,true,32,18,20',
  ])

  const criterion = (code, parameters = {}) => ({ code, parameters })
  const grade = criterion('MIN_ASSESSMENT_SCORE', { assessment_key: 'SECOND_PARTIAL' })
  const attendance = criterion('MIN_ATTENDANCE_PERCENTAGE')
  const mandatory = criterion('SECOND_INSTANCE_PARTIAL_AVERAGE', {
    assessment_keys: ['FIRST_PARTIAL', 'SECOND_PARTIAL'],
  })
  const parseFor = async (criteria, row) => {
    const layout = csv.getAcademicCsvLayout(criteria, schema)
    const header = csv.getAcademicCsvTemplate(layout.columns)
    const data = new TextEncoder().encode(header + row + '\r\n')
    const result = await csv.prepareAcademicCsv({
      name: 'datos.csv',
      size: data.byteLength,
      arrayBuffer: async () => data.buffer,
    }, schema, layout)
    return [header.trim(), ...result.csv.trim().split(/\r?\n/).slice(1)]
  }
  assert.deepEqual(await parseFor([grade], '1,Juan,0'), [
    'sis,nombre_completo,nota_sp',
    '1,SECOND_PARTIAL,true,0,,',
  ])
  assert.deepEqual(await parseFor([grade, attendance], '1,Juan,32,18,20'), [
    'sis,nombre_completo,nota_sp,asistencias,total_clases',
    '1,SECOND_PARTIAL,true,32,18,20',
  ])
  assert.deepEqual(await parseFor([mandatory], '1,Juan,28,32'), [
    'sis,nombre_completo,nota_pp,nota_sp',
    '1,FIRST_PARTIAL,true,28,,',
    '1,SECOND_PARTIAL,true,32,,',
  ])
  assert.deepEqual(await parseFor([attendance], '1,Juan,Sí,18,20'), [
    'sis,nombre_completo,rindio_pp,asistencias,total_clases',
    '1,FIRST_PARTIAL,true,,18,20',
  ])
  await assert.rejects(parseFor([attendance], '1,Juan,,18,20'), /indicar si rindió/)
  const taken = criterion('PREVIOUS_ASSESSMENTS_TAKEN', {
    assessment_keys: ['FIRST_PARTIAL', 'SECOND_PARTIAL'],
  })
  assert.deepEqual(await parseFor([taken], '1,Juan,Sí,No'), [
    'sis,nombre_completo,rindio_pp,rindio_sp',
    '1,FIRST_PARTIAL,true,,,',
    '1,SECOND_PARTIAL,false,,,',
  ])
})

test('persisted academic model combines mandatory and optional criteria, excludes inactive and uses assessment labels', () => {
  const { load } = createHarness()
  const csv = load(resolve(featureRoot, 'utils/academicCsv.ts'))
  const criterion = (code, parameters = {}) => ({ code, parameters })
  const mandatory = criterion('MIN_ASSESSMENT_SCORE', { assessment_key: 'SECOND_PARTIAL' })
  const taken = criterion('PREVIOUS_ASSESSMENTS_TAKEN', { assessment_keys: ['FIRST_PARTIAL'] })
  const attendance = criterion('MIN_ATTENDANCE_PERCENTAGE')
  const configuration = { mandatory_criteria: [mandatory], selected_criteria: [taken, attendance], inactive_criteria: [attendance] }
  const schema = { assessment_keys: ['FIRST_PARTIAL', 'SECOND_PARTIAL'] }
  const labels = [{ key: 'FIRST_PARTIAL', label: 'Diagnóstico' }, { key: 'SECOND_PARTIAL', label: 'Defensa final' }]
  const layout = csv.getAcademicCsvLayout(csv.getPersistedAcademicCriteria(configuration), schema, labels)
  assert.deepEqual(layout.columns.map(({ key }) => key), ['sis', 'nombre_completo', 'nota_sp', 'rindio_pp'])
  assert.deepEqual(layout.fields.map(({ key, scored, column }) => [key, scored, column.label]), [
    ['SECOND_PARTIAL', true, 'Nota Defensa final'], ['FIRST_PARTIAL', false, 'Rindió Diagnóstico'],
  ])
  assert.equal(layout.includesAttendance, false)
  assert.equal(layout.includesAverage, false)
  const fallback = csv.getAcademicCsvLayout([], schema, labels)
  assert.equal(fallback.fields.length, 2)
  assert.equal(fallback.includesAttendance, true)
  assert.equal(fallback.includesAverage, true)
  const inactive = csv.getAcademicCsvLayout([{ ...mandatory, status: 'INACTIVE' }], schema)
  assert.deepEqual(inactive.columns.map(({ key }) => key), fallback.columns.map(({ key }) => key))
})

test('academic CSV rejects invalid headers, row values, and file limits', async () => {
  const { load } = createHarness()
  const csv = load(resolve(featureRoot, 'utils/academicCsv.ts'))
  const schema = {
    columns: [
      'sis',
      'assessment_key',
      'was_taken',
      'score',
      'attended_classes',
      'total_classes',
    ],
    assessment_keys: ['FIRST_PARTIAL', 'SECOND_PARTIAL'],
    encoding: 'UTF-8',
    delimiter: ',',
    max_rows: 1,
    max_file_kb: 1,
    score_min: 0,
    score_max: 100,
    score_decimal_places: 2,
    was_taken_values: ['true', 'false'],
  }
  const header = 'sis,nombre_completo,nota_pp,nota_sp,asistencias,total_clases'
  const makeFile = (name, content) => {
    const bytes = new TextEncoder().encode(content)
    return {
      name,
      size: bytes.byteLength,
      arrayBuffer: async () => bytes.buffer,
    }
  }
  const invalidFiles = [
    [makeFile('datos.txt', `${header}\n202600001,Juan,28,32,18,20`), /\.csv/],
    [
      makeFile('datos.csv', `sis,nota_pp\n202600001,28`),
      /columnas deben estar/,
    ],
    [makeFile('datos.csv', `${header}\n,Juan,28,32,18,20`), /incluir el SIS/],
    [
      makeFile('datos.csv', `${header}\n202600001,Juan,nota,32,18,20`),
      /Nota PP debe ser numérica/,
    ],
    [
      makeFile('datos.csv', `${header}\n202600001,Juan,28,32,21,20`),
      /no pueden superar/,
    ],
    [
      makeFile(
        'datos.csv',
        `${header}\n202600001,Juan,28,32,18,20\n202600002,Maria,24,27,16,20`,
      ),
      /límite de 1 registros/,
    ],
  ]
  for (const [file, expectedMessage] of invalidFiles) {
    await assert.rejects(csv.prepareAcademicCsv(file, schema), (error) => {
      assert.match(error.message, expectedMessage)
      return true
    })
  }
})

test('academic records preserve absent scores and correction payload includes revision and reason', async () => {
  const records = {
    data: [
      {
        id: 12,
        sis_code: '202600001',
        assessments: { FIRST_PARTIAL: { was_taken: true, score: null } },
        attended_classes: null,
        total_classes: null,
        revision: 1,
      },
    ],
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
    patch: () => {
      throw httpError(422, {
        message: 'Revisa la nota.',
        errors: { 'assessments.FIRST_PARTIAL.score': ['Nota inválida.'] },
      })
    },
  })
  await assert.rejects(
    api.correctAcademicRecord(8, 12, {
      revision: 1,
      reason: 'Motivo',
      assessments: {},
      attended_classes: null,
      total_classes: null,
    }),
    (error) =>
      error.status === 422 &&
      error.fieldErrors['assessments.FIRST_PARTIAL.score'] === 'Nota inválida.',
  )
  const conflictHarness = createHarness({
    patch: () => {
      throw httpError(409, { message: 'Los datos académicos cambiaron.' })
    },
  })
  await assert.rejects(
    conflictHarness.api.correctAcademicRecord(8, 12, {
      revision: 1,
      reason: 'Motivo',
      assessments: {},
      attended_classes: null,
      total_classes: null,
    }),
    (error) => error.status === 409,
  )
})

test('evaluation preview preserves manual and non-override statuses from backend', async () => {
  const view = {
    id: 31,
    preview_id: 'snapshot-31',
    results: {
      data: [
        {
          student: { id: 5, display_name: 'Estudiante', sis: '202600001' },
          computed_status: 'ELIGIBLE',
          current_status: 'INELIGIBLE',
          effective_status: 'INELIGIBLE',
          manual_override_preserved: true,
          will_update: false,
          reason: 'Se conserva la decisión manual vigente.',
          missing_fields: [],
          eligibility_revision: 4,
          criteria_results: [
            {
              code: 'MIN_ASSESSMENT_SCORE',
              name: 'Nota mínima en una evaluación previa',
              status: 'PASSED',
              actual_value: 75,
              required_value: 60,
            },
          ],
        },
        {
          student: { id: 6, display_name: 'Sin override', sis: '202600002' },
          computed_status: 'INELIGIBLE',
          current_status: null,
          effective_status: 'INELIGIBLE',
          manual_override_preserved: false,
          will_update: true,
          reason: 'Resultado calculado.',
          missing_fields: [],
          eligibility_revision: null,
          criteria_results: [],
        },
      ],
      meta: { current_page: 1, per_page: 100, total: 2, last_page: 1 },
    },
    catalog: [],
    summary: { total: 2, eligible: 1, ineligible: 1, pending: 0 },
  }
  const { api, calls } = createHarness({ post: () => response({ data: view }) })
  const actual = await api.previewEligibilityEvaluation(
    17,
    3,
    'catalog-opaque-value',
  )
  assert.equal(
    calls[0].args[0],
    '/exams/17/eligibility-automation/evaluations/preview',
  )
  assert.deepEqual(calls[0].args[1], {
    configuration_revision: 3,
    catalog_revision: 'catalog-opaque-value',
  })
  assert.equal(actual.results.data[0].computed_status, 'ELIGIBLE')
  assert.equal(actual.results.data[0].current_status, 'INELIGIBLE')
  assert.equal(actual.results.data[0].manual_override_preserved, true)
  assert.equal(actual.results.data[0].effective_status, 'INELIGIBLE')
  assert.equal(actual.results.data[0].will_update, false)
  assert.equal(actual.results.data[0].criteria_results[0].status, 'PASSED')
  assert.equal(actual.results.data[1].manual_override_preserved, false)
  assert.equal(
    actual.results.data[1].effective_status,
    actual.results.data[1].computed_status,
  )
})

test('evaluation result pagination loads every backend snapshot page for confirmation summary', async () => {
  const first = {
    id: 31,
    results: {
      data: [{ student: { id: 1 } }],
      meta: { current_page: 1, per_page: 100, total: 101, last_page: 2 },
    },
  }
  const second = {
    data: {
      id: 31,
      results: {
        data: [{ student: { id: 2 } }],
        meta: { current_page: 2, per_page: 100, total: 101, last_page: 2 },
      },
    },
  }
  const { api, calls } = createHarness({ get: () => response(second) })
  const complete = await api.getAllEvaluationResults(17, first)
  assert.deepEqual(
    complete.results.data.map((item) => item.student.id),
    [1, 2],
  )
  assert.equal(
    calls[0].args[0],
    '/exams/17/eligibility-automation/evaluations/31',
  )
  assert.deepEqual(calls[0].args[1].params, { page: 2, per_page: 100 })
})

test('confirmation refreshes HU12 only after backend confirmation succeeds', async () => {
  const hu12 = [
    { id: 9, revision: 2, status: 'ELIGIBLE', sis_code: '202600001' },
  ]
  const result = {
    evaluation_id: 31,
    updated: 1,
    unchanged: 0,
    manual_preserved: 0,
    pending: 0,
  }
  const { api, calls } = createHarness({
    post: () => response({ data: result }),
    get: (path) =>
      path === '/exams/17/eligibilities'
        ? response({ data: hu12 })
        : response({ data: { data: [] } }),
  })
  const outcome = await api.confirmEvaluationAndReloadHu12(17, 'snapshot-31')
  assert.deepEqual(outcome.confirmation, result)
  assert.deepEqual(outcome.eligibilities, [
    {
      ...hu12[0],
      reason_code: null,
      reason: null,
      observations: null,
    },
  ])
  assert.equal(outcome.refreshError, null)
  assert.equal(
    calls[0].args[0],
    '/exams/17/eligibility-automation/evaluations/snapshot-31/confirm',
  )
  assert.equal(calls[1].args[0], '/exams/17/eligibilities')
})

test('evaluation 409 blocks local confirmation and preserves error status', async () => {
  const { api } = createHarness({
    post: () => {
      throw httpError(409, {
        code: 'AUTOMATION_CONFLICT',
        message: 'Genera otro preview.',
      })
    },
  })
  await assert.rejects(
    api.confirmEligibilityEvaluation(17, 'snapshot-31'),
    (error) => error.status === 409,
  )
})

test('consults both academic and evaluation histories and persisted detail', async () => {
  const paged = {
    data: [],
    meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
  }
  const detail = {
    id: 31,
    preview_id: 'snapshot-31',
    results: {
      data: [],
      meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 },
    },
    catalog: [],
  }
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
  assert.equal(
    calls[0].args[0],
    '/academic-offerings/8/academic-records/history',
  )
  assert.equal(calls[1].args[0], '/exams/17/eligibility-automation/evaluations')
  assert.equal(
    calls[2].args[0],
    '/exams/17/eligibility-automation/evaluations/31',
  )
})

test('admin global criteria use read/edit/status/history endpoints only', async () => {
  const criterion = {
    code: 'MIN_ATTENDANCE_PERCENTAGE',
    name: 'Porcentaje mínimo de asistencia',
    description: null,
    status: 'ACTIVE',
    revision: 1,
    parameters: [
      {
        key: 'minimum_percentage',
        type: 'number',
        required: true,
        minimum_exclusive: 0,
        maximum: 100,
      },
    ],
    mandatory_for_exam_types: [],
    fixed_parameters: null,
  }
  const page = {
    data: [criterion],
    meta: { current_page: 1, per_page: 100, total: 1, last_page: 1 },
    catalog_revision: 'catalog-opaque-value',
  }
  const history = {
    data: [],
    meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
  }
  const { api, calls } = createHarness({
    get: (path) =>
      path.endsWith('/history')
        ? response(history)
        : path.endsWith('/MIN_ATTENDANCE_PERCENTAGE')
          ? response({ data: criterion })
          : response(page),
    patch: () => response({ data: criterion }),
  })
  assert.deepEqual(await api.getEligibilityCriteria(), page)
  assert.deepEqual(
    await api.getEligibilityCriterion('MIN_ATTENDANCE_PERCENTAGE'),
    criterion,
  )
  await api.updateEligibilityCriterion('MIN_ATTENDANCE_PERCENTAGE', {
    revision: 1,
    name: 'Asistencia mínima',
    description: 'Porcentaje institucional.',
  })
  await api.updateEligibilityCriterionStatus(
    'MIN_ATTENDANCE_PERCENTAGE',
    2,
    'INACTIVE',
  )
  assert.deepEqual(
    await api.getEligibilityCriterionHistory('MIN_ATTENDANCE_PERCENTAGE'),
    history,
  )
  assert.deepEqual(
    calls.map(({ method, args }) => [method, args[0]]),
    [
      ['get', '/admin/eligibility-criteria'],
      ['get', '/admin/eligibility-criteria/MIN_ATTENDANCE_PERCENTAGE'],
      ['patch', '/admin/eligibility-criteria/MIN_ATTENDANCE_PERCENTAGE'],
      ['patch', '/admin/eligibility-criteria/MIN_ATTENDANCE_PERCENTAGE/status'],
      ['get', '/admin/eligibility-criteria/MIN_ATTENDANCE_PERCENTAGE/history'],
    ],
  )
  assert.deepEqual(calls[2].args[1], {
    revision: 1,
    name: 'Asistencia mínima',
    description: 'Porcentaje institucional.',
  })
  assert.deepEqual(calls[3].args[1], {
    revision: 2,
    status: 'INACTIVE',
  })
  assert.deepEqual(calls[0].args[1].params, { page: 1, per_page: 100 })
  assert.deepEqual(calls[4].args[1].params, { page: 1, per_page: 10 })
  assert.equal(
    calls.some((call) => call.method === 'post'),
    false,
  )
})

test('frontend role gates exclude collaborators and expose manual/pending safeguards', () => {
  const router = readFileSync(
    resolve(sourceRoot, 'app/router/router.tsx'),
    'utf8',
  )
  const page = readFileSync(
    resolve(featureRoot, 'pages/EligibilityAutomationPage.tsx'),
    'utf8',
  )
  assert.match(router, /ProtectedRoute allowedRoles=\{\['DOCENTE'\]\}/)
  assert.match(router, /ProtectedRoute allowedRoles=\{\['ADMINISTRADOR'\]\}/)
  assert.match(router, /teacher\/exams\/:examId\/eligibilities\/automatic/)
  assert.match(router, /path: 'eligibility-policies'/)
  assert.match(page, /catalog_revision: configuration\.catalog_revision/)
  assert.match(page, /manual_review_conditions: manualReviewConditions/)
  assert.match(page, /Condiciones de revisión manual/)
  assert.match(page, /Criterios actualmente inactivos/)
  assert.match(page, /Criterios aplicados/)
  assert.match(page, /Se conserva la decisión manual vigente/)
  assert.match(page, /return 'Pendiente'/)
  assert.match(page, /Estado efectivo/)
  assert.match(page, /disabled=\{locked\}/)
  assert.match(page, /<fieldset/)
  assert.match(page, /schema\.type === 'array'/)
  assert.match(page, /schema\.maximum/)
  assert.doesNotMatch(
    page,
    /eligibility_policy_id|policy_definition|Política v/,
  )
})

test('academic records omit empty search and serialize a nonempty string without changing it', async () => {
  const { api, calls } = createHarness({
    get: () => response({ data: [], meta: {} }),
  })
  for (const search of ['', '   ', 'Primer parcial', ' 202600001 '])
    await api.getAcademicRecords(8, 1, search)
  assert.deepEqual(calls[0].args[1].params, { page: 1, per_page: 10 })
  assert.deepEqual(calls[1].args[1].params, { page: 1, per_page: 10 })
  assert.equal(calls[2].args[1].params.search, 'Primer parcial')
  assert.equal(calls[3].args[1].params.search, ' 202600001 ')
  const axios = require('axios').default
  assert.equal(
    axios.getUri({ url: calls[0].args[0], params: calls[0].args[1].params }),
    '/academic-offerings/8/academic-records?page=1&per_page=10',
  )
})
