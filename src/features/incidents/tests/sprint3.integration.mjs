// Opt-in real backend smoke test. Only accepts an isolated sprint3_test_* fixture.
// Run after tmp/sprint3-integration setup; never targets the development database.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import axios from 'axios'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'
const root = new URL('../../../../..', import.meta.url)
const dir = new URL('tmp/sprint3-integration/', root)
const fixture = JSON.parse(await readFile(new URL('fixture.json', dir), 'utf8'))
const database = JSON.parse(
  await readFile(new URL('database.json', dir), 'utf8'),
).database
assert.match(database, /^sprint3_test_[a-f0-9]{12}$/)
const exam = fixture.exam_id,
  student = fixture.student_ids[0]
const client = axios.create({
  baseURL: 'http://127.0.0.1:8053/api/v1',
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${fixture.tokens.owner}`,
  },
})
const identity = await client.get('/me')
assert.equal(
  identity.headers['x-eida-qa-database'],
  database,
  'Backend must attest the disposable database before any write',
)
assert.equal(identity.data.data.id, fixture.owner_id)
const h = sourceHarness({ '@/shared/api/httpClient': { httpClient: client } })
const incidents = h.load('features/incidents/api/incidentsApi.ts'),
  consultation = h.load('features/incidents/api/incidentConsultationApi.ts'),
  infractions = h.load('features/infractions/api/infractionsApi.ts'),
  expulsions = h.load('features/expulsions/api/expulsionsApi.ts'),
  annulment = h.load('features/entry-annulments/api/entryAnnulmentApi.ts')
const filters = {
  search: '',
  type: '',
  status: '',
  date_from: '',
  date_to: '',
  page: 1,
}
const checks = [],
  responses = {}
async function check(label, fn) {
  try {
    await fn()
    checks.push({ label, passed: true })
    console.log('PASS ' + label)
  } catch (error) {
    checks.push({
      label,
      passed: false,
      error: error.message,
      status: error.response?.status ?? error.status ?? null,
    })
    console.error('FAIL ' + label, error.message, error.response?.data ?? '')
  }
}
await check(
  'HU27 real create/detail/list with and without identified student',
  async () => {
    const created = await incidents.createIncident(exam, {
      type: 'IDENTIFICATION',
      description: '  Documento revisado en integración.  ',
      student_id: student,
    })
    assert.equal(created.student.id, student)
    assert.equal(created.reported_by.id, fixture.owner_id)
    responses.incident = created
    assert.deepEqual(await incidents.getIncident(exam, created.id), created)
    const anonymous = await incidents.createIncident(exam, {
      type: 'ENVIRONMENT',
      description: 'Problema del ambiente QA.',
      student_id: null,
    })
    assert.equal(anonymous.student, null)
    assert.equal((await incidents.getIncidents(exam)).data.length, 2)
  },
)
await check('HU29 real filters/counts and CSV/PDF exports', async () => {
  const page = await consultation.getIncidentConsultation(exam, {
    ...filters,
    search: '0099001',
    type: 'IDENTIFICATION',
    status: 'REPORTED',
  })
  assert.equal(page.meta.total, 1)
  for (const format of ['csv', 'pdf']) {
    const r = await client.get(`/exams/${exam}/incidents/export`, {
      params: { format, type: 'IDENTIFICATION' },
      responseType: 'arraybuffer',
    })
    const bytes = Buffer.from(r.data)
    assert.ok(bytes.length > 0)
    assert.match(
      r.headers['content-type'],
      format === 'pdf' ? /application\/pdf/ : /text\/csv/,
    )
    if (format === 'pdf') assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
    else assert.match(bytes.toString(), /Documento revisado/)
    await writeFile(new URL(`reporte-real.${format}`, dir), bytes)
  }
})
await check(
  'HU28 real annulment preserves original evidence, history and summary',
  async () => {
    const history = (await client.get(`/exams/${exam}/entry-control/entries`))
      .data
    const original = history.data.find((r) => r.entry.id === fixture.entry_id)
    const result = await annulment.annulEntry(exam, original, {
      reason: 'Corrección justificada QA.',
      confirmed: true,
    })
    assert.equal(result.entry.status, 'ANNULLED')
    const after = (await client.get(`/exams/${exam}/entry-control/students`))
      .data
    assert.equal(after.summary.registered, 0)
    assert.equal(
      (await client.get(`/exams/${exam}/entry-control/entries`)).data.data.find(
        (r) => r.entry.id === fixture.entry_id,
      ).entry.status,
      'ANNULLED',
    )
    responses.annulment = result
  },
)
await check(
  'HU30 real create/detail/status/audit/antecedents with full revision',
  async () => {
    const record = await infractions.createInfraction(exam, {
      student_id: student,
      type: 'COPYING',
      description: 'Uso de apuntes QA.',
      observations: 'Observación conservada.',
    })
    responses.infraction = record
    const original = await infractions.getInfraction(exam, record.id)
    const result = await infractions.changeInfractionStatus(exam, original, {
      status: 'CONFIRMED',
      reason: 'Evidencia verificada QA.',
      confirmed: true,
    })
    assert.equal(result.data.status, 'CONFIRMED')
    assert.equal(result.history.length, 2)
    responses.infraction = result.data
    assert.equal(
      (await infractions.getStudentInfractions(exam, student)).data[0]
        .infraction.id,
      record.id,
    )
    await assert.rejects(
      infractions.changeInfractionStatus(exam, original, {
        status: 'RESOLVED',
        reason: 'Versión anterior QA.',
        confirmed: true,
      }),
      (e) => e.status === 409,
    )
  },
)
await check(
  'HU31 real related infractions/create/duplicate/history and retained attendance',
  async () => {
    assert.ok(responses.infraction)
    const list = await expulsions.getRelatedInfractions(exam, student)
    assert.equal(list.data[0].id, responses.infraction.id)
    const record = await expulsions.createExpulsion(exam, {
      student_id: student,
      reason: 'Decisión explícita QA.',
      infraction_id: responses.infraction.id,
      confirmed: true,
    })
    responses.expulsion = record
    assert.equal(
      (await expulsions.getExpulsion(exam, record.id)).data.status,
      'EXPELLED',
    )
    assert.equal(
      (await expulsions.getExpulsionHistory(exam, student)).data[0].expulsion
        .id,
      record.id,
    )
    await assert.rejects(
      expulsions.createExpulsion(exam, {
        student_id: student,
        reason: 'No duplicar.',
        infraction_id: null,
        confirmed: true,
      }),
      (e) => e.status === 409,
    )
    const rows = (await client.get(`/exams/${exam}/entry-control/entries`)).data
      .data
    assert.ok(
      rows.some(
        (r) => r.entry.id === fixture.entry_id && r.entry.status === 'ANNULLED',
      ),
    )
    assert.equal(
      (await client.get(`/exams/${exam}/entry-control/students/${student}`))
        .data.data.is_expelled,
      true,
    )
  },
)
await check(
  'Real role isolation: collaborator may report, cannot discipline; other teacher denied; admin consultation',
  async () => {
    client.defaults.headers.Authorization = `Bearer ${fixture.tokens.collaborator}`
    await incidents.createIncident(exam, {
      student_id: null,
      type: 'ENVIRONMENT',
      description: 'Reporte del colaborador QA.',
    })
    await assert.rejects(
      infractions.getInfractions(exam),
      (e) => e.status === 403,
    )
    await assert.rejects(
      expulsions.getExpulsions(exam),
      (e) => e.status === 403,
    )
    client.defaults.headers.Authorization = `Bearer ${fixture.tokens.other}`
    await assert.rejects(incidents.getIncidents(exam), (e) => e.status === 403)
    client.defaults.headers.Authorization = `Bearer ${fixture.tokens.admin}`
    const catalog = h.load('features/incidents/api/incidentExamCatalogApi.ts')
    assert.ok(
      (await catalog.getIncidentExamCatalog('', 1)).data.some(
        (v) => v.id === exam,
      ),
    )
    assert.equal(
      (await consultation.getIncidentConsultation(exam, filters)).permissions
        .can_create,
      false,
    )
  },
)
await writeFile(
  new URL('api-results.json', dir),
  JSON.stringify({ database, checks, responses }, null, 2),
)
h.unmount()
assert.ok(
  checks.every((c) => c.passed),
  'Real integration checks failed',
)
