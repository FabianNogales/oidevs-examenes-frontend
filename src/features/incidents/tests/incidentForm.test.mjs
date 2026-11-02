import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'

const saved = {
  id: 9,
  exam_id: 4,
  type: 'IDENTIFICATION',
  description: 'Documento ilegible.',
  origin: 'MANUAL',
  status: 'REPORTED',
  student: null,
  reported_by: { id: 2, name: 'Docente' },
  created_at: '2026-11-02T14:00:00Z',
}
const payload = {
  type: 'IDENTIFICATION',
  description: 'Documento ilegible.',
  student_id: null,
}
function setup(
  handler = async () => ({ data: { data: saved } }),
  overrides = {},
) {
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
    'react-router': { Link: 'link', Navigate: 'navigate' },
    ...overrides,
  })
  return { h, calls }
}

test('HU27 submission serializes double clicks and stays locked after confirmed success', async () => {
  let finish
  const { h, calls } = setup(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const { useIncidentSubmission } = h.load(
    'features/incidents/hooks/useIncidentSubmission.ts',
  )
  let state = h.render(() => useIncidentSubmission(4))
  const request = state.submit(payload)
  void state.submit(payload)
  assert.equal(calls.length, 1)
  assert.equal(h.render().saving, true)
  finish({ data: { data: saved } })
  await request
  state = h.render()
  assert.equal(state.saved.id, 9)
  assert.equal(state.saving, false)
  await state.submit(payload)
  assert.equal(calls.length, 1)
  h.unmount()
})

test('HU27 invalid fields never send HTTP; 422 retains errors and permits correction', async () => {
  let rejected = true
  const { h, calls } = setup(async () => {
    if (rejected)
      throw {
        isAxiosError: true,
        response: {
          status: 422,
          data: { errors: { description: ['Revisa la descripción.'] } },
        },
      }
    return { data: { data: saved } }
  })
  const { useIncidentSubmission } = h.load(
    'features/incidents/hooks/useIncidentSubmission.ts',
  )
  let state = h.render(() => useIncidentSubmission(4))
  await state.submit({ ...payload, description: ' ' })
  assert.equal(calls.length, 0)
  assert.ok(h.render().fieldErrors.description)
  await h.render().submit(payload)
  state = h.render()
  assert.equal(state.fieldErrors.description, 'Revisa la descripción.')
  assert.equal(state.saved, null)
  rejected = false
  await state.submit(payload)
  assert.equal(h.render().saved.id, 9)
  h.unmount()
})

test('HU27 expired authorization blocks further posts without a false saved record', async () => {
  const { h, calls } = setup(async () => {
    throw { isAxiosError: true, response: { status: 403 } }
  })
  const { useIncidentSubmission } = h.load(
    'features/incidents/hooks/useIncidentSubmission.ts',
  )
  h.render(() => useIncidentSubmission(4))
  await h.render().submit(payload)
  const state = h.render()
  assert.equal(state.forbidden, true)
  assert.equal(state.saved, null)
  await state.submit(payload)
  assert.equal(calls.length, 1)
  h.unmount()
})

test('HU27 form retains the description after a server failure and never displays success', async () => {
  const { h } = setup(async () => {
    throw { isAxiosError: true, response: { status: 500 } }
  })
  const { IncidentForm } = h.load(
    'features/incidents/components/IncidentForm.tsx',
  )
  let tree = h.render(() =>
    IncidentForm({ examId: 4, backTo: '/exams/4/incidents' }),
  )
  nodes(tree, (n) => n.type === 'select')[0].props.onChange({
    target: { value: payload.type },
  })
  nodes(tree, (n) => n.type === 'textarea')[0].props.onChange({
    target: { value: payload.description },
  })
  tree = h.render()
  nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  await settle()
  tree = h.render()
  assert.equal(
    nodes(tree, (n) => n.type === 'textarea')[0].props.value,
    payload.description,
  )
  assert.equal(nodes(tree, (n) => n.props?.role === 'alert').length, 1)
  assert.doesNotMatch(textContent(tree), /Incidencia registrada/)
  h.unmount()
})

test('HU27 choosing identified requires a selection; unidentified student posts null', async () => {
  const { h, calls } = setup()
  const { IncidentForm } = h.load(
    'features/incidents/components/IncidentForm.tsx',
  )
  let tree = h.render(() =>
    IncidentForm({ examId: 4, backTo: '/exams/4/incidents' }),
  )
  nodes(tree, (n) => n.type === 'select')[0].props.onChange({
    target: { value: payload.type },
  })
  nodes(tree, (n) => n.type === 'textarea')[0].props.onChange({
    target: { value: payload.description },
  })
  nodes(tree, (n) => n.props?.type === 'radio')[1].props.onChange()
  tree = h.render()
  tree.props.onSubmit({ preventDefault() {} })
  tree = h.render()
  assert.equal(calls.length, 0)
  assert.match(textContent(tree), /Selecciona un estudiante o indica/)
  nodes(tree, (n) => n.props?.type === 'radio')[0].props.onChange()
  tree = h.render()
  tree.props.onSubmit({ preventDefault() {} })
  await settle()
  assert.equal(calls[0][1].student_id, null)
  assert.match(textContent(h.render()), /Incidencia registrada/)
  const redirect = nodes(h.render(), (n) => n.type === 'navigate')[0]
  assert.equal(redirect.props.to, '/exams/4/incidents/9')
  assert.equal(redirect.props.replace, true)
  assert.equal(redirect.props.state.createdIncidentId, 9)
  h.unmount()
})

test('HU27 student search is debounced and cannot show stale results from a previous query', async () => {
  const pending = [],
    queries = []
  const { h } = setup(undefined, {
    '@/features/exams/api/entryControlApi': {
      getEntryControlStudents: (_examId, query, signal) => {
        queries.push({ query, signal })
        return new Promise((resolve) => pending.push(resolve))
      },
      getEntryControlErrorMessage: () => 'No autorizado',
    },
  })
  const { IncidentStudentPicker } = h.load(
    'features/incidents/components/IncidentStudentPicker.tsx',
  )
  const render = () =>
    h.render(() =>
      IncidentStudentPicker({
        examId: 4,
        value: null,
        disabled: false,
        onChange() {},
      }),
    )
  let tree = render()
  nodes(tree, (n) => n.type === 'input')[0].props.onChange({
    target: { value: 'Ana' },
  })
  render()
  h.advance(299)
  assert.equal(queries.length, 0)
  h.advance(1)
  tree = render()
  nodes(tree, (n) => n.type === 'input')[0].props.onChange({
    target: { value: 'Bruno' },
  })
  render()
  h.advance(300)
  assert.equal(queries[0].signal.aborted, true)
  pending[0]({
    exam: { id: 4 },
    data: [
      {
        student_id: 7,
        first_names: 'Ana',
        last_names: 'Prueba',
        sis_code: '00123',
      },
    ],
  })
  await settle()
  assert.match(textContent(render()), /Buscando/)
  assert.doesNotMatch(textContent(render()), /Ana Prueba/)
  pending[1]({ exam: { id: 4 }, data: [] })
  await settle()
  assert.match(textContent(render()), /No se encontraron estudiantes/)
  h.unmount()
})

test('HU27 embedded form preselects the identified student and returns its saved evidence without redirecting away from control', async () => {
  const student = {
    id: 7,
    first_names: 'Ana',
    last_names: 'Prueba',
    sis_code: '00123',
    identity_number: '0099',
  }
  const confirmations = []
  const { h, calls } = setup(async () => ({
    data: { data: { ...saved, type: 'INELIGIBILITY', student } },
  }))
  const { IncidentForm } = h.load(
    'features/incidents/components/IncidentForm.tsx',
  )
  const onCreated = (value) => confirmations.push(value)
  let tree = h.render(() =>
    IncidentForm({
      examId: 4,
      backTo: '/exams/4/incidents',
      initialStudent: student,
      initialType: 'INELIGIBILITY',
      onCreated,
      onCancel() {},
    }),
  )
  assert.equal(
    nodes(tree, (n) => n.type?.name === 'IncidentStudentPicker')[0].props.value
      .id,
    7,
  )
  nodes(tree, (n) => n.type === 'textarea')[0].props.onChange({
    target: { value: payload.description },
  })
  tree = h.render()
  tree.props.onSubmit({ preventDefault() {} })
  await settle()
  tree = h.render()
  assert.equal(calls[0][1].student_id, 7)
  assert.equal(calls[0][1].type, 'INELIGIBILITY')
  assert.equal(confirmations[0].id, 9)
  assert.equal(nodes(tree, (n) => n.type === 'navigate').length, 0)
  h.unmount()
})
