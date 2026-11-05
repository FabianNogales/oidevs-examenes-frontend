import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const exam = { id: 4, name: 'Parcial', subject_name: 'Redes' }
const record = {
  id: 9,
  exam_id: 4,
  student: {
    id: 7,
    first_names: 'Ana',
    last_names: 'Prueba',
    sis_code: '00123',
    identity_number: '00099',
  },
  type: 'COPYING',
  description: 'Se observó uso de apuntes.',
  observations: 'Revisar con el estudiante.',
  status: 'REPORTED',
  occurred_at: '2026-11-03T14:00:00Z',
  updated_at: '2026-11-03T14:00:00Z',
  reported_by: { id: 2, name: 'Docente responsable' },
  permissions: {
    can_update: true,
    allowed_statuses: ['CONFIRMED', 'RESOLVED'],
  },
}
const created = {
  id: 1,
  action: 'CREATED',
  from_status: null,
  to_status: 'REPORTED',
  reason: null,
  performed_by: record.reported_by,
  performed_at: record.occurred_at,
}
const detail = { exam, data: record, history: [created] }
const updated = {
  exam,
  data: {
    ...record,
    status: 'CONFIRMED',
    updated_at: '2026-11-03T14:10:00Z',
    permissions: { can_update: true, allowed_statuses: ['RESOLVED'] },
  },
  history: [
    created,
    {
      id: 2,
      action: 'STATUS_CHANGED',
      from_status: 'REPORTED',
      to_status: 'CONFIRMED',
      reason: 'Se revisó la evidencia.',
      performed_by: record.reported_by,
      performed_at: '2026-11-03T14:10:00Z',
    },
  ],
}
const payload = {
  student_id: 7,
  type: 'COPYING',
  description: '  Se observó uso de apuntes.  ',
  observations: '  Revisar con el estudiante.  ',
}
const change = {
  status: 'CONFIRMED',
  reason: '  Se revisó la evidencia.  ',
  confirmed: true,
}
function setup(handler = async () => ({ data: { data: record } })) {
  const calls = []
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: Object.fromEntries(
        ['get', 'post', 'patch'].map((method) => [
          method,
          (...args) => {
            calls.push([method, ...args])
            return handler(method, ...args)
          },
        ]),
      ),
    },
  })
  return { h, calls, ...h.load('features/infractions/api/infractionsApi.ts') }
}

test('HU30 creation sends only the student and reported facts, never author/time/status or sanctions', async () => {
  const api = setup()
  assert.deepEqual(
    await api.createInfraction(4, {
      ...payload,
      reported_by: 999,
      status: 'CONFIRMED',
      sanction: 'EXPEL',
    }),
    record,
  )
  assert.deepEqual(api.calls, [
    [
      'post',
      '/exams/4/infractions',
      {
        student_id: 7,
        type: 'COPYING',
        description: record.description,
        observations: record.observations,
      },
    ],
  ])
  assert.equal(record.student.sis_code, '00123')
})

test('HU30 supports copying, cheating and impersonation; rejects required missing fields before HTTP', async () => {
  const api = setup()
  const { validateInfraction, INFRACTION_TYPE_LABELS } = api.h.load(
    'features/infractions/utils/infractionValidation.ts',
  )
  assert.deepEqual(Object.keys(INFRACTION_TYPE_LABELS), [
    'COPYING',
    'CHEATING',
    'IMPERSONATION',
  ])
  for (const type of Object.keys(INFRACTION_TYPE_LABELS))
    assert.deepEqual(validateInfraction({ ...payload, type }), {})
  for (const patch of [
    { student_id: null },
    { student_id: 0 },
    { type: 'ENVIRONMENT' },
    { description: ' \n ' },
    { observations: null },
  ])
    await assert.rejects(api.createInfraction(4, { ...payload, ...patch }), {
      name: 'InfractionApiError',
      status: 422,
    })
  assert.equal(api.calls.length, 0)
  const optional = setup(async () => ({
    data: { data: { ...record, observations: null } },
  }))
  await optional.createInfraction(4, { ...payload, observations: '  ' })
  assert.equal(optional.calls[0][2].observations, null)
})

test('HU30 creation never accepts silent confirmation, a different student or missing server audit data', async () => {
  for (const patch of [
    { status: 'CONFIRMED' },
    { exam_id: 5 },
    { student: { ...record.student, id: 8 } },
    { reported_by: null },
    { occurred_at: '2026-11-03 10:00:00' },
    { permissions: undefined },
  ]) {
    const api = setup(async () => ({ data: { data: { ...record, ...patch } } }))
    await assert.rejects(api.createInfraction(4, payload))
    assert.equal(
      api.calls.length,
      1,
      'Never automatically retry a potentially persisted report',
    )
  }
})

test('HU30 list validates scope, real permissions and pagination, including a genuine empty exam', async () => {
  const page = {
    exam,
    permissions: { can_create: true },
    data: [record],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
  }
  assert.deepEqual(
    await setup(async () => ({ data: page })).getInfractions(4),
    page,
  )
  const empty = { ...page, data: [], meta: { ...page.meta, total: 0 } }
  assert.deepEqual(
    await setup(async () => ({ data: empty })).getInfractions(4),
    empty,
  )
  for (const patch of [
    { exam: { ...exam, id: 5 } },
    { permissions: {} },
    { data: [record, record] },
    { meta: { ...page.meta, total: 2 } },
  ])
    await assert.rejects(
      setup(async () => ({ data: { ...page, ...patch } })).getInfractions(4),
    )
})

test('HU30 detail requires an ordered auditable state chain, not a silently changed status', async () => {
  assert.deepEqual(
    await setup(async () => ({ data: detail })).getInfraction(4, 9),
    detail,
  )
  assert.deepEqual(
    await setup(async () => ({ data: updated })).getInfraction(4, 9),
    updated,
  )
  for (const value of [
    { ...detail, data: { ...record, status: 'CONFIRMED' } },
    { ...detail, history: [] },
    { ...detail, history: [created, created] },
    { ...updated, history: [created, { ...updated.history[1], reason: null }] },
    {
      ...updated,
      history: [created, { ...updated.history[1], from_status: 'RESOLVED' }],
    },
    {
      ...updated,
      history: [created, { ...updated.history[1], performed_by: null }],
    },
    {
      ...updated,
      history: [
        created,
        { ...updated.history[1], action: 'UPDATED', reason: null },
      ],
    },
    {
      ...detail,
      history: [{ ...created, performed_by: { id: 99, name: 'Otro usuario' } }],
    },
  ])
    await assert.rejects(
      setup(async () => ({ data: value })).getInfraction(4, 9),
    )
})

test('HU30 status change requires server permission, allowed transition, reason and explicit confirmation', async () => {
  const api = setup(async () => ({ data: updated }))
  for (const patch of [
    { status: 'REPORTED' },
    { status: 'EXPELLED' },
    { reason: ' ' },
    { confirmed: false },
  ])
    await assert.rejects(
      api.changeInfractionStatus(4, detail, { ...change, ...patch }),
      { status: 422 },
    )
  const readonly = {
    ...detail,
    data: {
      ...record,
      permissions: { can_update: false, allowed_statuses: [] },
    },
  }
  await assert.rejects(api.changeInfractionStatus(4, readonly, change), {
    status: 403,
  })
  assert.equal(api.calls.length, 0)
  assert.deepEqual(await api.changeInfractionStatus(4, detail, change), updated)
  assert.deepEqual(api.calls[0], [
    'patch',
    '/exams/4/infractions/9/status',
    {
      status: 'CONFIRMED',
      reason: 'Se revisó la evidencia.',
      expected_updated_at: record.updated_at,
    },
  ])
})

test('HU30 status confirmation preserves original evidence and appends a new attributed audit event', async () => {
  for (const value of [
    { ...updated, data: { ...updated.data, description: 'Alterada' } },
    {
      ...updated,
      data: { ...updated.data, student: { ...record.student, id: 8 } },
    },
    { ...updated, data: { ...updated.data, updated_at: record.updated_at } },
    {
      ...updated,
      history: [
        { ...created, performed_by: { id: 3, name: 'Otro' } },
        updated.history[1],
      ],
    },
  ]) {
    const api = setup(async () => ({ data: value }))
    await assert.rejects(api.changeInfractionStatus(4, detail, change))
    assert.equal(api.calls.length, 1)
  }
  assert.equal(detail.data.status, 'REPORTED')
  assert.equal(detail.history.length, 1)
})

test('HU30 student antecedents are scoped by context and student, including authorized previous exams', async () => {
  const history = {
    context: { exam_id: 4, student_id: 7 },
    data: [
      {
        exam: { ...exam, id: 5, name: 'Examen anterior' },
        infraction: { ...record, exam_id: 5 },
      },
    ],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
  }
  const api = setup(async () => ({ data: history }))
  assert.deepEqual(await api.getStudentInfractions(4, 7), history)
  assert.equal(api.calls[0][1], '/exams/4/students/7/infractions')
  for (const patch of [
    { context: { exam_id: 5, student_id: 7 } },
    {
      data: [
        {
          exam,
          infraction: { ...record, student: { ...record.student, id: 8 } },
        },
      ],
    },
  ])
    await assert.rejects(
      setup(async () => ({
        data: { ...history, ...patch },
      })).getStudentInfractions(4, 7),
    )
})

test('HU30 invalid IDs do not request another scope and errors never fake success or retry writes', async () => {
  const api = setup()
  for (const id of [0, -1, NaN, 1.5, '4']) {
    await assert.rejects(api.getInfractions(id))
    await assert.rejects(api.getInfraction(4, id))
    await assert.rejects(api.getStudentInfractions(4, id))
  }
  assert.equal(api.calls.length, 0)
  for (const status of [401, 403, 404, 409, 422, 500, 501]) {
    const failure = setup(async () => {
      throw {
        isAxiosError: true,
        response: {
          status,
          data: { errors: { description: ['Descripción inválida.'] } },
        },
      }
    })
    await assert.rejects(failure.createInfraction(4, payload), (error) => {
      assert.equal(error.status, status)
      if (status === 422)
        assert.equal(error.fieldErrors.description, 'Descripción inválida.')
      return true
    })
    assert.equal(failure.calls.length, 1)
  }
})

test('HU30 cancelled requests remain cancellations and revision conflicts do not change local evidence', async () => {
  const cancellation = { __CANCEL__: true }
  await assert.rejects(
    setup(async () => {
      throw cancellation
    }).getInfraction(4, 9),
    (error) => error === cancellation,
  )
  const api = setup(async () => {
    throw { isAxiosError: true, response: { status: 409 } }
  })
  await assert.rejects(api.changeInfractionStatus(4, detail, change), {
    status: 409,
  })
  assert.equal(detail.data.status, 'REPORTED')
  assert.equal(api.calls.length, 1)
})
