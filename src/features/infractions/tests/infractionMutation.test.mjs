import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'
import { record, student } from './infractionFixtures.mjs'

const payload = {
  student_id: 7,
  type: 'COPYING',
  description: record.description,
  observations: record.observations,
}
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
    '@/features/incidents/components/IncidentStudentPicker': {
      IncidentStudentPicker: 'picker',
    },
    'react-router': { Link: 'link', Navigate: 'navigate' },
  })
  return { h, calls }
}

test('HU30 serializes writes and retains the lock after confirmed creation', async () => {
  let finish
  const ui = setup(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const { useInfractionMutation } = ui.h.load(
    'features/infractions/hooks/useInfractionMutation.ts',
  )
  const { createInfraction } = ui.h.load(
    'features/infractions/api/infractionsApi.ts',
  )
  const { validateInfraction } = ui.h.load(
    'features/infractions/utils/infractionValidation.ts',
  )
  ui.h.render(() =>
    useInfractionMutation(
      (value) => createInfraction(4, value),
      validateInfraction,
    ),
  )
  const request = ui.h.render().submit(payload)
  await ui.h.render().submit(payload)
  assert.equal(ui.calls.length, 1)
  finish({ data: { data: record } })
  await request
  assert.equal(ui.h.render().saved.status, 'REPORTED')
  await ui.h.render().submit(payload)
  assert.equal(ui.calls.length, 1)
  ui.h.unmount()
})

test('HU30 422 allows correction; uncertainty, denied authorization and conflicts require refresh', async () => {
  for (const status of [422, 403, 409, 500]) {
    const ui = setup(async () => {
      throw { isAxiosError: true, response: { status } }
    })
    const { useInfractionMutation } = ui.h.load(
      'features/infractions/hooks/useInfractionMutation.ts',
    )
    const { createInfraction } = ui.h.load(
      'features/infractions/api/infractionsApi.ts',
    )
    const { validateInfraction } = ui.h.load(
      'features/infractions/utils/infractionValidation.ts',
    )
    ui.h.render(() =>
      useInfractionMutation(
        (value) => createInfraction(4, value),
        validateInfraction,
      ),
    )
    await ui.h.render().submit(payload)
    assert.equal(ui.h.render().needsRefresh, status !== 422)
    assert.equal(ui.h.render().saved, null)
    await ui.h.render().submit(payload)
    assert.equal(ui.calls.length, status === 422 ? 2 : 1)
    ui.h.unmount()
  }
})

test('HU30 required student/type/description block POST and server failure preserves all draft facts', async () => {
  const ui = setup(async () => {
    throw { isAxiosError: true, response: { status: 500 } }
  })
  const { InfractionForm } = ui.h.load(
    'features/infractions/components/InfractionForm.tsx',
  )
  let tree = ui.h.render(() => InfractionForm({ examId: 4 }))
  await nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  assert.equal(ui.calls.length, 0)
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'picker')[0].props.onChange(student)
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'select')[0].props.onChange({
    target: { value: 'COPYING' },
  })
  tree = ui.h.render()
  const inputs = nodes(tree, (n) => n.type === 'textarea')
  inputs[0].props.onChange({ target: { value: record.description } })
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'textarea')[1].props.onChange({
    target: { value: record.observations },
  })
  tree = ui.h.render()
  await nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  await settle()
  tree = ui.h.render()
  assert.equal(
    nodes(tree, (n) => n.type === 'textarea')[0].props.value,
    record.description,
  )
  assert.equal(
    nodes(tree, (n) => n.type === 'textarea')[1].props.value,
    record.observations,
  )
  assert.equal(
    nodes(tree, (n) => n.type === 'button' && n.props.type === 'submit')[0]
      .props.disabled,
    true,
  )
  assert.equal(ui.calls.length, 1)
  ui.h.unmount()
})
