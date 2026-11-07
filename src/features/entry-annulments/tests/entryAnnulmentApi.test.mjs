import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const original = {
  student: {
    student_id: 7,
    first_names: 'Ana',
    last_names: 'Prueba',
    sis_code: '00123',
    identity_number: '12345',
  },
  permissions: { can_annul: true },
  entry: {
    id: 9,
    exam_id: 4,
    student_id: 7,
    room_id: 2,
    status: 'VALID',
    entered_at: '2026-11-03T10:00:00-04:00',
    verification_method: 'QR',
    verified_by: 3,
    verified_by_name: 'Colaborador original',
    annulment: null,
  },
}
const saved = {
  ...original,
  permissions: { can_annul: false },
  entry: {
    ...original.entry,
    status: 'ANNULLED',
    annulment: {
      reason: 'Registro equivocado.',
      annulled_at: '2026-11-03T10:05:00-04:00',
      annulled_by: { id: 2, name: 'Docente responsable' },
    },
  },
}
const payload = { reason: '  Registro equivocado.  ', confirmed: true }

function setup(handler = async () => ({ data: { data: saved } })) {
  const calls = []
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        post: (...args) => {
          calls.push(args)
          return handler(...args)
        },
      },
    },
  })
  return {
    calls,
    h,
    ...h.load('features/entry-annulments/api/entryAnnulmentApi.ts'),
  }
}

test('HU28 sends only the justification, retaining the original attendance and server audit', async () => {
  const api = setup()
  const before = structuredClone(original)
  assert.deepEqual(
    await api.annulEntry(4, original, { ...payload, annulled_by: 999 }),
    saved,
  )
  assert.deepEqual(api.calls, [
    [
      '/exams/4/entry-control/entries/9/annulment',
      { reason: 'Registro equivocado.' },
    ],
  ])
  assert.deepEqual(original, before)
})

test('HU28 rejects empty reasons and missing explicit confirmation without HTTP', async () => {
  const api = setup()
  for (const data of [
    { ...payload, reason: '' },
    { ...payload, reason: ' \n ' },
    { ...payload, reason: null },
    { ...payload, confirmed: false },
    { ...payload, confirmed: undefined },
  ])
    await assert.rejects(api.annulEntry(4, original, data), {
      name: 'EntryAnnulmentApiError',
      status: 422,
    })
  assert.equal(api.calls.length, 0)
})

test('HU28 missing server permission, collaborators and previously annulled entries cannot initiate a write', async () => {
  const api = setup()
  for (const record of [
    { ...original, permissions: undefined },
    { ...original, permissions: { can_annul: false } },
    { ...original, entry: saved.entry },
    { ...original, entry: { ...original.entry, status: 'UNKNOWN' } },
  ])
    await assert.rejects(api.annulEntry(4, record, payload), { status: 403 })
  assert.equal(api.calls.length, 0)
})

test('HU28 cross-exam, cross-student and invalid identifiers never reach the server', async () => {
  const api = setup()
  for (const id of [0, -1, NaN, 1.5, '4', 5])
    await assert.rejects(api.annulEntry(id, original, payload))
  await assert.rejects(
    api.annulEntry(
      4,
      { ...original, student: { ...original.student, student_id: 8 } },
      payload,
    ),
  )
  assert.equal(api.calls.length, 0)
})

test('HU28 refuses incomplete audit or a response that changes original attendance evidence', async () => {
  for (const patch of [
    { id: 10 },
    { exam_id: 5 },
    { student_id: 8 },
    { room_id: 3 },
    { entered_at: '2026-11-03T10:01:00-04:00' },
    { verified_by: 2 },
    { verified_by_name: 'Otro' },
    { verification_method: 'MANUAL' },
    { status: 'VALID' },
    { annulment: null },
    { annulment: { ...saved.entry.annulment, annulled_by: null } },
    {
      annulment: {
        ...saved.entry.annulment,
        annulled_at: '2026-11-03 10:05:00',
      },
    },
  ]) {
    const api = setup(async () => ({
      data: { data: { ...saved, entry: { ...saved.entry, ...patch } } },
    }))
    await assert.rejects(api.annulEntry(4, original, payload), {
      name: 'EntryAnnulmentApiError',
    })
    assert.equal(
      api.calls.length,
      1,
      'Never retry a potentially persisted annulment automatically',
    )
  }
})

test('HU28 errors preserve the selected attendance, expose validation and never retry', async () => {
  const before = structuredClone(original)
  for (const status of [401, 403, 404, 409, 422, 500, 501]) {
    const api = setup(async () => {
      throw {
        isAxiosError: true,
        response: {
          status,
          data: { errors: { reason: ['Motivo requerido.'] } },
        },
      }
    })
    await assert.rejects(api.annulEntry(4, original, payload), (error) => {
      assert.equal(error.status, status)
      if (status === 422)
        assert.equal(error.fieldErrors.reason, 'Motivo requerido.')
      return true
    })
    assert.equal(api.calls.length, 1)
    assert.deepEqual(original, before)
  }
})

test('HU28 network uncertainty never becomes a fabricated success', async () => {
  const api = setup(async () => {
    throw new Error('Network disconnected')
  })
  await assert.rejects(
    api.annulEntry(4, original, payload),
    /Consulta el historial|consulta el historial/,
  )
  assert.equal(api.calls.length, 1)
})

test('HU28 an annulled record stays non-actionable even with stale positive permission', () => {
  const { canAnnulEntry } = setup().h.load(
    'features/entry-annulments/utils/entryAnnulmentValidation.ts',
  )
  assert.equal(canAnnulEntry(original), true)
  assert.equal(
    canAnnulEntry({ ...saved, permissions: { can_annul: true } }),
    false,
  )
})
