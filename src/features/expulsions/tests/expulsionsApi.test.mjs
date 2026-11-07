import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'
const exam = { id: 4, name: 'Parcial', subject_name: 'Redes' }
const student = {
  id: 7,
  first_names: 'Ana',
  last_names: 'Prueba',
  sis_code: '00123',
  identity_number: '00099',
}
const infraction = {
  id: 8,
  exam_id: 4,
  student_id: 7,
  type: 'COPYING',
  status: 'REPORTED',
  description: 'Uso de apuntes.',
}
const record = {
  id: 9,
  exam_id: 4,
  student,
  reason: 'Decisión justificada.',
  expelled_at: '2026-11-03T14:00:00Z',
  expelled_by: { id: 2, name: 'Responsable' },
  status: 'EXPELLED',
  infraction: null,
}
const meta = { current_page: 1, last_page: 1, per_page: 10, total: 1 }
const payload = {
  student_id: 7,
  reason: '  Decisión justificada.  ',
  infraction_id: null,
  confirmed: true,
}
function setup(handler = async () => ({ data: { data: record } })) {
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
  return { ...h.load('features/expulsions/api/expulsionsApi.ts'), calls, h }
}
test('HU31 creation sends only student, reason and optional association; never actor, time, status or attendance mutation', async () => {
  const a = setup()
  assert.deepEqual(
    await a.createExpulsion(4, {
      ...payload,
      expelled_by: 999,
      expelled_at: 'forged',
      status: 'ACTIVE',
      delete_attendance: true,
    }),
    record,
  )
  assert.deepEqual(a.calls, [
    [
      'post',
      '/exams/4/expulsions',
      { student_id: 7, reason: record.reason, infraction_id: null },
    ],
  ])
})
test('HU31 validates required fields and explicit confirmation before any request', async () => {
  const a = setup()
  for (const invalid of [
    { student_id: 0 },
    { reason: '   ' },
    { infraction_id: 0 },
    { confirmed: false },
  ])
    await assert.rejects(
      a.createExpulsion(4, { ...payload, ...invalid }),
      (e) => e.status === 422,
    )
  assert.equal(a.calls.length, 0)
  await assert.rejects(a.getExpulsions(0))
  await assert.rejects(a.getExpulsion(4, -1))
  assert.equal(a.calls.length, 0)
})
test('HU31 confirms exact student, reason, association, server identity/time and EXPELLED status', async () => {
  for (const patch of [
    { student: { ...student, id: 88 } },
    { exam_id: 5 },
    { reason: 'other' },
    { status: 'ACTIVE' },
    { expelled_at: '2026-11-03' },
    { expelled_by: null },
    { infraction: undefined },
  ]) {
    const a = setup(async () => ({ data: { data: { ...record, ...patch } } }))
    await assert.rejects(a.createExpulsion(4, payload))
    assert.equal(a.calls.length, 1)
  }
  const a = setup(async () => ({ data: { data: { ...record, infraction } } }))
  assert.equal(
    (await a.createExpulsion(4, { ...payload, infraction_id: 8 })).infraction
      .id,
    8,
  )
  await assert.rejects(a.createExpulsion(4, payload))
})
test('HU31 duplicate or forbidden writes remain errors with no retries', async () => {
  for (const status of [401, 403, 404, 409, 422, 500, 501]) {
    const a = setup(async () => {
      throw {
        isAxiosError: true,
        response: {
          status,
          data: {
            errors: {
              reason: ['Motivo inválido'],
              infraction_id: ['No autorizada'],
            },
          },
        },
      }
    })
    await assert.rejects(
      a.createExpulsion(4, payload),
      (e) =>
        e.status === status &&
        (status !== 422 || e.fieldErrors.infraction_id === 'No autorizada'),
    )
    assert.equal(a.calls.length, 1)
  }
})
test('HU31 validates list context, pagination, permissions and duplicate students', async () => {
  const result = {
    exam,
    permissions: { can_create: true },
    data: [record],
    meta,
  }
  const a = setup(async () => ({ data: result }))
  assert.deepEqual(await a.getExpulsions(4), result)
  for (const value of [
    { ...result, exam: { ...exam, id: 5 } },
    { ...result, permissions: {} },
    {
      ...result,
      data: [record, { ...record, id: 10 }],
      meta: { ...meta, total: 2 },
    },
    { ...result, meta: { ...meta, total: 4 } },
  ])
    await assert.rejects(setup(async () => ({ data: value })).getExpulsions(4))
})
test('HU31 detail cannot show a record from another exam/id', async () => {
  assert.deepEqual(
    await setup(async () => ({ data: { exam, data: record } })).getExpulsion(
      4,
      9,
    ),
    { exam, data: record },
  )
  await assert.rejects(
    setup(async () => ({ data: { exam, data: record } })).getExpulsion(4, 10),
  )
  await assert.rejects(
    setup(async () => ({
      data: { exam: { ...exam, id: 5 }, data: record },
    })).getExpulsion(4, 9),
  )
})
test('HU31 related infractions are restricted to selected student/exam and preserve reported versus confirmed', async () => {
  const result = {
    context: { exam_id: 4, student_id: 7 },
    data: [infraction],
    meta,
  }
  assert.equal(
    (await setup(async () => ({ data: result })).getRelatedInfractions(4, 7))
      .data[0].status,
    'REPORTED',
  )
  for (const patch of [
    { student_id: 99 },
    { exam_id: 5 },
    { status: 'ACTIVE' },
  ])
    await assert.rejects(
      setup(async () => ({
        data: { ...result, data: [{ ...infraction, ...patch }] },
      })).getRelatedInfractions(4, 7),
    )
})
test('HU31 authorized history accepts prior exams but rejects cross-student data or forged empty errors', async () => {
  const result = {
    context: { exam_id: 4, student_id: 7 },
    data: [{ exam: { ...exam, id: 5 }, expulsion: { ...record, exam_id: 5 } }],
    meta,
  }
  assert.deepEqual(
    await setup(async () => ({ data: result })).getExpulsionHistory(4, 7),
    result,
  )
  await assert.rejects(
    setup(async () => ({
      data: { ...result, context: { exam_id: 5, student_id: 7 } },
    })).getExpulsionHistory(4, 7),
  )
  await assert.rejects(
    setup(async () => ({
      data: {
        ...result,
        data: [
          { exam, expulsion: { ...record, student: { ...student, id: 8 } } },
        ],
      },
    })).getExpulsionHistory(4, 7),
  )
  await assert.rejects(
    setup(async () => {
      throw { isAxiosError: true, response: { status: 403 } }
    }).getExpulsionHistory(4, 7),
    (e) => e.status === 403,
  )
})
