import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const saved = {
  id: 9,
  exam_id: 4,
  type: 'IDENTIFICATION',
  description: 'Documento ilegible.',
  origin: 'MANUAL',
  status: 'REPORTED',
  student: null,
  reported_by: { id: 2, name: 'Docente responsable' },
  created_at: '2026-11-02T14:00:00Z',
}
const payload = {
  type: 'IDENTIFICATION',
  description: '  Documento ilegible.  ',
  student_id: null,
}

function setup(handler = async () => ({ data: { data: saved } })) {
  const calls = []
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: Object.fromEntries(
        ['get', 'post'].map((method) => [
          method,
          (...args) => {
            calls.push([method, ...args])
            return handler(method, ...args)
          },
        ]),
      ),
    },
  })
  return { calls, ...h.load('features/incidents/api/incidentsApi.ts'), h }
}

test('HU27 manual creation sends only user fields; time, author, status and origin come from the server', async () => {
  const api = setup()
  const controller = new AbortController()
  assert.deepEqual(
    await api.createIncident(
      4,
      { ...payload, reported_by: 500, origin: 'AUTOMATIC' },
      controller.signal,
    ),
    saved,
  )
  assert.deepEqual(api.calls, [
    [
      'post',
      '/exams/4/incidents',
      {
        type: 'IDENTIFICATION',
        description: 'Documento ilegible.',
        student_id: null,
      },
      { signal: controller.signal },
    ],
  ])
})

test('HU27 supports the five categories and rejects missing/invalid values before HTTP', async () => {
  const api = setup()
  const { INCIDENT_TYPE_LABELS, validateIncident } = api.h.load(
    'features/incidents/utils/incidentValidation.ts',
  )
  assert.equal(Object.keys(INCIDENT_TYPE_LABELS).length, 5)
  for (const type of Object.keys(INCIDENT_TYPE_LABELS))
    assert.deepEqual(validateIncident({ ...payload, type }), {})
  for (const data of [
    { ...payload, type: 'OTHER' },
    { ...payload, description: '  ' },
    { ...payload, student_id: 0 },
  ])
    await assert.rejects(api.createIncident(4, data), {
      name: 'IncidentApiError',
      status: 422,
    })
  assert.equal(api.calls.length, 0)
})

test('HU27 identified student is preserved, and a suspect report remains unconfirmed', async () => {
  const student = {
    id: 7,
    first_names: 'Ana',
    last_names: 'Prueba',
    sis_code: '00123',
    identity_number: null,
  }
  const data = { ...saved, type: 'SUSPECTED_IMPERSONATION', student }
  const api = setup(async () => ({ data: { data } }))
  const result = await api.createIncident(4, {
    ...payload,
    type: data.type,
    student_id: 7,
  })
  assert.equal(result.student.sis_code, '00123')
  assert.equal(result.status, 'REPORTED')
  assert.equal(api.calls.length, 1)
})

test('HU27 detail refuses a different incident, exam or incomplete evidence', async () => {
  for (const data of [
    { ...saved, id: 10 },
    { ...saved, exam_id: 5 },
    { ...saved, reported_by: null },
    { ...saved, created_at: '2026-11-02 10:00:00' },
    { ...saved, student: undefined },
  ]) {
    const api = setup(async () => ({ data: { data } }))
    await assert.rejects(api.getIncident(4, 9), { name: 'IncidentApiError' })
  }
  const api = setup()
  assert.deepEqual(await api.getIncident(4, 9), saved)
  assert.equal(api.calls[0][1], '/exams/4/incidents/9')
})

test('HU27 invalid route identifiers never send a request', async () => {
  const api = setup()
  for (const id of [0, -1, NaN, 1.5, '4', Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(api.getIncident(id, 9))
    await assert.rejects(api.getIncident(4, id))
    await assert.rejects(api.createIncident(id, payload))
  }
  assert.equal(api.calls.length, 0)
})

test('HU27 creation never reports success for another student or automatic event', async () => {
  for (const data of [{ ...saved, origin: 'AUTOMATIC' }, saved]) {
    const api = setup(async () => ({ data: { data } }))
    await assert.rejects(api.createIncident(4, { ...payload, student_id: 7 }), {
      name: 'IncidentApiError',
    })
    assert.equal(
      api.calls.length,
      1,
      'No automatic retry of a potentially persisted write',
    )
  }
})

test('HU27 authorization, validation and server failures reject without fallback success or retries', async () => {
  for (const status of [401, 403, 404, 409, 422, 500, 501]) {
    const api = setup(async () => {
      throw {
        isAxiosError: true,
        response: {
          status,
          data: { errors: { description: ['Descripción requerida.'] } },
        },
      }
    })
    await assert.rejects(api.createIncident(4, payload), (error) => {
      assert.equal(error.status, status)
      if (status === 422)
        assert.equal(error.fieldErrors.description, 'Descripción requerida.')
      return true
    })
    assert.equal(api.calls.length, 1)
  }
})

test('HU27 cancelled requests remain cancellations', async () => {
  const cancellation = { __CANCEL__: true }
  const api = setup(async () => {
    throw cancellation
  })
  await assert.rejects(api.getIncident(4, 9), (error) => error === cancellation)
})
