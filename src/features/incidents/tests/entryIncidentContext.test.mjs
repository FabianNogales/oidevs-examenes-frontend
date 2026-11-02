import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
} from '../../../shared/tests/sourceHarness.mjs'

const identity = {
  student_id: 7,
  first_names: 'Ana',
  last_names: 'Prueba',
  sis_code: '00123',
  identity_number: '0099',
}
const response = {
  result: 'AUTHORIZED',
  message: 'Registrado',
  processed_at: '2026-11-02T14:00:00Z',
  data: { student: identity },
}

test('HU27 result actions report only available identities and never change the entry response', () => {
  const h = sourceHarness()
  const { EntryIncidentActions } = h.load(
    'features/incidents/components/EntryIncidentActions.tsx',
  )
  for (const result of [
    'AUTHORIZED',
    'ALREADY_REGISTERED',
    'DENIED',
    'INVALID_QR',
  ]) {
    const reports = [],
      original = {
        ...response,
        result,
        data: result === 'INVALID_QR' ? null : response.data,
      }
    const before = JSON.stringify(original)
    const tree = h.render(() =>
      EntryIncidentActions({
        response: original,
        examId: 4,
        disabled: false,
        onReport: (value) => reports.push(value),
        onView() {},
      }),
    )
    nodes(tree, (n) => n.type === 'button')[0].props.onClick()
    assert.equal(reports.length, 1)
    assert.equal(
      reports[0].student?.sis_code ?? null,
      result === 'INVALID_QR' ? null : '00123',
    )
    assert.equal(JSON.stringify(original), before)
  }
  h.unmount()
})

test('HU27 wrong-exam QR without persisted reference never offers a duplicate manual report or false confirmation', () => {
  const h = sourceHarness()
  const { EntryIncidentActions } = h.load(
    'features/incidents/components/EntryIncidentActions.tsx',
  )
  for (const incident of [
    undefined,
    null,
    { id: 9, exam_id: 5 },
    { id: 0, exam_id: 4 },
  ]) {
    const tree = h.render(() =>
      EntryIncidentActions({
        response: { ...response, result: 'WRONG_EXAM', incident },
        examId: 4,
        disabled: false,
        onReport() {
          assert.fail('No duplicate manual event')
        },
        onView() {
          assert.fail('Invalid event reference')
        },
      }),
    )
    assert.equal(nodes(tree, (n) => n.type === 'button').length, 0)
    assert.match(textContent(tree), /no devolvió una referencia/)
    assert.doesNotMatch(textContent(tree), /registrada correctamente/)
  }
  h.unmount()
})

test('HU27 a valid persisted reference opens its detail instead of creating a report', () => {
  const h = sourceHarness(),
    views = []
  const { EntryIncidentActions } = h.load(
    'features/incidents/components/EntryIncidentActions.tsx',
  )
  const tree = h.render(() =>
    EntryIncidentActions({
      response: {
        ...response,
        result: 'WRONG_EXAM',
        incident: { id: 9, exam_id: 4 },
      },
      examId: 4,
      disabled: true,
      onReport() {
        assert.fail('No manual duplicate')
      },
      onView: (id) => views.push(id),
    }),
  )
  const button = nodes(tree, (n) => n.type === 'button')[0]
  assert.equal(button.props.disabled, true)
  assert.match(textContent(button), /Ver incidencia/)
  button.props.onClick()
  assert.deepEqual(views, [9])
  h.unmount()
})

test('HU27 reports pause the mounted scanner and restore the same tab, list and selected student', () => {
  const list = {
    query: 'Ana',
    setFilter() {},
    setPage() {},
    response: { exam: { id: 4, room: { id: 2 }, entry_available: true } },
    roomId: 2,
    reload() {},
  }
  const overrides = {
    'react-router': {
      Link: 'link',
      useParams: () => ({ examId: '4' }),
      useSearchParams: () => [new URLSearchParams('from=teacher')],
    },
    '@/shared/components/Breadcrumbs/Breadcrumbs': {
      Breadcrumbs: 'breadcrumbs',
    },
    '../hooks/useEntryControlStudents': { useEntryControlStudents: () => list },
    '@/features/incidents/components/IncidentControlDialog': {
      IncidentControlDialog: 'incident-dialog',
    },
    '@/features/collaborations/components/CollaborationModal': {
      CollaborationModal: 'modal',
    },
  }
  for (const name of [
    'EntryQrPanel',
    'EntryControlStudentsList',
    'EntryControlStudentModal',
    'EntryControlExamHeader',
    'EntryStudentsSummary',
    'EntryQrStudentIdentity',
  ])
    overrides[`../components/${name}`] = { [name]: name }
  const h = sourceHarness(overrides)
  const { EntryControlPage } = h.load(
    'features/exams/pages/EntryControlPage.tsx',
  )
  const render = () =>
    h.render(() => {
      const page = EntryControlPage()
      return page.type(page.props)
    })
  let tree = render()
  nodes(tree, (n) => n.props?.role === 'tab')
    .find((n) => textContent(n) === 'Registro de asistencia')
    .props.onClick()
  tree = render()
  nodes(tree, (n) => n.props?.role === 'tab')
    .find((n) => textContent(n) === 'Escanear QR')
    .props.onClick()
  tree = render()
  const scanner = nodes(tree, (n) => n.type === 'EntryQrPanel')[0]
  assert.equal(scanner.props.active, true)
  scanner.props.onReportIncident({
    student: {
      id: 7,
      first_names: 'Ana',
      last_names: 'Prueba',
      sis_code: '00123',
      identity_number: '0099',
    },
  })
  tree = render()
  assert.equal(
    nodes(tree, (n) => n.type === 'EntryQrPanel')[0].props.active,
    false,
  )
  const dialog = nodes(tree, (n) => n.type === 'incident-dialog')[0]
  assert.equal(dialog.props.mode.context.student.id, 7)
  dialog.props.onClose()
  tree = render()
  assert.equal(
    nodes(tree, (n) => n.type === 'EntryQrPanel')[0].props.active,
    true,
  )
  assert.equal(list.query, 'Ana')
  // Return to verification and report from an identified student's modal.
  nodes(tree, (n) => n.props?.role === 'tab')
    .find((n) => textContent(n) === 'Verificación')
    .props.onClick()
  tree = render()
  nodes(tree, (n) => n.type === 'EntryControlStudentsList')[0].props.onView(7)
  tree = render()
  nodes(
    tree,
    (n) => n.type === 'EntryControlStudentModal',
  )[0].props.onReportIncident(identity)
  tree = render()
  assert.equal(
    nodes(tree, (n) => n.type === 'EntryControlStudentModal').length,
    0,
  )
  nodes(tree, (n) => n.type === 'incident-dialog')[0].props.onClose()
  tree = render()
  assert.equal(
    nodes(tree, (n) => n.type === 'EntryControlStudentModal')[0].props
      .studentId,
    7,
  )
  h.unmount()
})
