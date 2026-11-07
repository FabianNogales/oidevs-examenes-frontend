import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'

const record = {
  student: {
    student_id: 7,
    first_names: 'Ana',
    last_names: 'Prueba',
    sis_code: '00123',
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
  },
}
const saved = {
  ...record,
  entry: {
    ...record.entry,
    status: 'ANNULLED',
    annulment: {
      reason: 'Registro equivocado.',
      annulled_at: '2026-11-03T10:05:00-04:00',
      annulled_by: { id: 2, name: 'Docente' },
    },
  },
}
const payload = { reason: 'Registro equivocado.', confirmed: true }
function setup(handler) {
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
    h,
    calls,
    ...h.load('features/entry-annulments/hooks/useEntryAnnulment.ts'),
  }
}

test('HU28 double submission makes one request and confirmed success stays locked', async () => {
  let finish
  const { h, calls, useEntryAnnulment } = setup(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  h.render(() => useEntryAnnulment(4, record))
  const request = h.render().submit(payload)
  await h.render().submit(payload)
  assert.equal(calls.length, 1)
  assert.equal(h.render().busy, true)
  finish({ data: { data: saved } })
  await request
  assert.equal(h.render().saved.entry.status, 'ANNULLED')
  assert.equal(h.render().busy, false)
  await h.render().submit(payload)
  assert.equal(calls.length, 1)
  h.unmount()
})

test('HU28 validation can be corrected, but uncertain/conflicting writes require a history refresh', async () => {
  for (const status of [422, 403, 409, 500, null]) {
    const { h, calls, useEntryAnnulment } = setup(async () => {
      throw {
        isAxiosError: true,
        response: {
          status,
          data: { errors: { reason: ['Revisa el motivo.'] } },
        },
      }
    })
    h.render(() => useEntryAnnulment(4, record))
    await h.render().submit(payload)
    assert.equal(h.render().saved, null)
    assert.equal(h.render().needsRefresh, status !== 422)
    await h.render().submit(payload)
    assert.equal(calls.length, status === 422 ? 2 : 1)
    h.unmount()
  }
})

test('HU28 incomplete confirmation never posts and cancel leaves the attendance untouched', async () => {
  const { h, calls } = setup(async () => ({ data: { data: saved } }))
  const { AnnulEntryConfirmation } = h.load(
    'features/entry-annulments/components/AnnulEntryConfirmation.tsx',
  )
  let cancelled = 0,
    notified = 0
  let tree = h.render(() =>
    AnnulEntryConfirmation({
      examId: 4,
      record,
      onCancel: () => cancelled++,
      onAnnulled: () => notified++,
    }),
  )
  assert.match(textContent(tree), /Ana Prueba/)
  assert.match(textContent(tree), /Colaborador original/)
  await nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  tree = h.render()
  assert.match(textContent(tree), /Escribe el motivo/)
  assert.match(textContent(tree), /Confirma explícitamente/)
  nodes(
    tree,
    (n) => n.type === 'button' && n.props.type === 'button',
  )[0].props.onClick()
  assert.equal(cancelled, 1)
  assert.equal(notified, 0)
  assert.equal(calls.length, 0)
  assert.equal(record.entry.status, 'VALID')
  h.unmount()
})

test('HU28 failed submission retains the justification and never invokes success', async () => {
  const { h } = setup(async () => {
    throw { isAxiosError: true, response: { status: 500 } }
  })
  const { AnnulEntryConfirmation } = h.load(
    'features/entry-annulments/components/AnnulEntryConfirmation.tsx',
  )
  let notified = 0
  let tree = h.render(() =>
    AnnulEntryConfirmation({
      examId: 4,
      record,
      onCancel() {},
      onAnnulled: () => notified++,
    }),
  )
  nodes(tree, (n) => n.type === 'textarea')[0].props.onChange({
    target: { value: payload.reason },
  })
  nodes(tree, (n) => n.type === 'input')[0].props.onChange({
    target: { checked: true },
  })
  tree = h.render()
  await nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  await settle()
  tree = h.render()
  assert.equal(
    nodes(tree, (n) => n.type === 'textarea')[0].props.value,
    payload.reason,
  )
  assert.equal(
    nodes(tree, (n) => n.type === 'button' && n.props.type === 'submit')[0]
      .props.disabled,
    true,
  )
  assert.match(textContent(tree), /Actualízalo|actualízalo/)
  assert.equal(notified, 0)
  h.unmount()
})

test('HU28 missing permission never renders a destructive form', () => {
  const { h } = setup(async () => {
    throw Error('Unexpected request')
  })
  const { AnnulEntryConfirmation } = h.load(
    'features/entry-annulments/components/AnnulEntryConfirmation.tsx',
  )
  const tree = h.render(() =>
    AnnulEntryConfirmation({
      examId: 4,
      record: { ...record, permissions: undefined },
      onCancel() {},
      onAnnulled() {},
    }),
  )
  assert.equal(nodes(tree, (n) => n.type === 'form').length, 0)
  assert.match(textContent(tree), /no está autorizado/)
  h.unmount()
})
