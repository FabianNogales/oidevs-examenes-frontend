import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'
import { detail, confirmed, record } from './infractionFixtures.mjs'

function setup(handler = async () => ({ data: confirmed })) {
  const calls = []
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        get: handler,
        patch: (...args) => {
          calls.push(args)
          return handler(...args)
        },
      },
    },
    'react-router': {
      Link: 'link',
      Navigate: 'navigate',
      NavLink: 'nav-link',
      useParams: () => ({ examId: '4', infractionId: '9' }),
      useLocation: () => ({ state: { createdInfractionId: 9 } }),
      useSearchParams: () => [new URLSearchParams('page=2')],
    },
  })
  return { h, calls }
}

test('HU30 information preserves the original facts and never labels a reported record as confirmed', () => {
  const ui = setup()
  const { InfractionInformation } = ui.h.load(
    'features/infractions/components/InfractionInformation.tsx',
  )
  const tree = InfractionInformation({ detail })
  for (const value of [
    record.description,
    record.observations,
    '00123',
    '00099',
    'Docente responsable',
    'no constituye una infracción confirmada',
  ])
    assert.ok(textContent(tree).includes(value))
  assert.equal(
    nodes(tree, (n) => n.type === 'time')[0].props.dateTime,
    record.occurred_at,
  )
  assert.equal(nodes(tree, (n) => n.type === 'button').length, 0)
})

test('HU30 audit displays authorized actor/time/reason without granting action buttons', () => {
  const ui = setup()
  const { InfractionAuditTrail } = ui.h.load(
    'features/infractions/components/InfractionAuditTrail.tsx',
  )
  const tree = InfractionAuditTrail({ events: confirmed.history })
  assert.match(textContent(tree), /Reportada → Confirmada/)
  assert.match(textContent(tree), /Se revisó la evidencia/)
  assert.equal(nodes(tree, (n) => n.type === 'li').length, 2)
  assert.equal(nodes(tree, (n) => n.type === 'button').length, 0)
})

test('HU30 state form exposes only server-authorized transitions and no form for a read-only record', () => {
  for (const allowed of [true, false]) {
    const ui = setup()
    const { InfractionStatusForm } = ui.h.load(
      'features/infractions/components/InfractionStatusForm.tsx',
    )
    const current = {
      ...confirmed,
      data: {
        ...confirmed.data,
        permissions: {
          can_update: allowed,
          allowed_statuses: allowed ? ['RESOLVED'] : [],
        },
      },
    }
    const tree = ui.h.render(() =>
      InfractionStatusForm({
        detail: current,
        onSaved() {},
        onCancel() {},
        onBusyChange() {},
      }),
    )
    assert.equal(nodes(tree, (n) => n.type === 'form').length, allowed ? 1 : 0)
    if (allowed)
      assert.deepEqual(
        nodes(tree, (n) => n.type === 'option').map((n) => n.props.value),
        ['', 'RESOLVED'],
      )
    ui.h.unmount()
  }
})

test('HU30 explicit confirmation is required and conflict keeps the justification without another write', async () => {
  const ui = setup(async () => {
    throw { isAxiosError: true, response: { status: 409 } }
  })
  const { InfractionStatusForm } = ui.h.load(
    'features/infractions/components/InfractionStatusForm.tsx',
  )
  let saved = 0
  let tree = ui.h.render(() =>
    InfractionStatusForm({
      detail,
      onSaved() {
        saved++
      },
      onCancel() {},
      onBusyChange() {},
    }),
  )
  await nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  assert.equal(ui.calls.length, 0)
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'select')[0].props.onChange({
    target: { value: 'CONFIRMED' },
  })
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'textarea')[0].props.onChange({
    target: { value: 'Se revisó la evidencia.' },
  })
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'input')[0].props.onChange({
    target: { checked: true },
  })
  tree = ui.h.render()
  await nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  await settle()
  tree = ui.h.render()
  assert.equal(
    nodes(tree, (n) => n.type === 'textarea')[0].props.value,
    'Se revisó la evidencia.',
  )
  assert.equal(
    nodes(tree, (n) => n.type === 'button' && n.props.type === 'submit')[0]
      .props.disabled,
    true,
  )
  await nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  assert.equal(ui.calls.length, 1)
  assert.equal(saved, 0)
  ui.h.unmount()
})

test('HU30 successful decision notifies once with server audit and does not mutate the original detail', async () => {
  const ui = setup()
  const { InfractionStatusForm } = ui.h.load(
    'features/infractions/components/InfractionStatusForm.tsx',
  )
  const results = []
  let tree = ui.h.render(() =>
    InfractionStatusForm({
      detail,
      onSaved: (value) => results.push(value),
      onCancel() {},
      onBusyChange() {},
    }),
  )
  nodes(tree, (n) => n.type === 'select')[0].props.onChange({
    target: { value: 'CONFIRMED' },
  })
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'textarea')[0].props.onChange({
    target: { value: 'Se revisó la evidencia.' },
  })
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'input')[0].props.onChange({
    target: { checked: true },
  })
  tree = ui.h.render()
  await nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  ui.h.render()
  ui.h.render()
  assert.equal(results.length, 1)
  assert.deepEqual(results[0], confirmed)
  assert.equal(detail.data.status, 'REPORTED')
  ui.h.unmount()
})

test('HU30 unauthorized detail exposes neither original evidence nor a fabricated creation notice', async () => {
  const ui = setup(async () => {
    throw { isAxiosError: true, response: { status: 403 } }
  })
  const { InfractionDetailPage } = ui.h.load(
    'features/infractions/pages/InfractionDetailPage.tsx',
  )
  const root = InfractionDetailPage()
  const resolved = root.type(root.props)
  ui.h.render(() => resolved.type(resolved.props))
  await settle()
  const tree = ui.h.render()
  assert.match(textContent(tree), /No tienes autorización/)
  assert.doesNotMatch(textContent(tree), /Infracción registrada/)
  assert.equal(
    nodes(tree, (n) => n.type?.name === 'InfractionInformation').length,
    0,
  )
  ui.h.unmount()
})
