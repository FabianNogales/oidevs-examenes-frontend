import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

const exam = {
  id: 17, entry_available: false, entry_unavailable_reason: 'EXAM_NOT_STARTED',
  entry_opens_at: '2026-10-22T14:00:00-04:00',
  entry_closes_at: '2026-10-22T15:00:00-04:00', server_time: '2026-10-22T13:00:00-04:00',
  room: { id: 7, name: 'Ambiente asignado' },
}
const student = {
  student_id: 23, first_names: 'Ana', last_names: 'Prueba', sis_code: '00123',
  controlled_room_id: 7, student_status: 'ACTIVE', enrollment_status: 'ACTIVE',
  eligibility_status: 'ELIGIBLE', room_status: 'MATCH', entry_status: 'PENDING',
  meets_entry_conditions: true, blockers: [],
}

test('global reasons remain explicit and an EXAM_UNAVAILABLE blocker does not imply a date or state', () => {
  const h = sourceHarness()
  const { entryUnavailableReasonMessage, entryBlockerMessage } = h.load('features/exams/utils/entryAvailabilityDisplay.ts')
  for (const [reason, pattern] of [
    ['EXAM_NOT_STARTED', /todavía no comenzó/], ['EXAM_ENDED', /ya finalizó/],
    ['EXAM_FINISHED', /ya finalizó/], ['EXAM_CANCELLED', /fue cancelado/],
    ['EXAM_STATE_NOT_ALLOWED', /estado actual/], ['NEW_REASON', /en este momento/],
    [null, /en este momento/],
  ]) assert.match(entryUnavailableReasonMessage(reason), pattern)
  const message = 'El examen no está disponible para registrar ingresos.'
  assert.equal(entryBlockerMessage({ code: 'EXAM_UNAVAILABLE', message }), message)
  assert.equal(entryBlockerMessage({ code: 'EXAM_UNAVAILABLE', message: 'EXAM_UNAVAILABLE' }), message)
  assert.equal(entryBlockerMessage({ code: 'INELIGIBLE', message: 'Condición pendiente.' }), 'Condición pendiente.')
})

function pageHarness(initialExam) {
  const list = { response: { exam: initialExam, summary: {} }, roomId: 7 }
  const components = {
    EntryControlStudentModal: 'student-modal', EntryControlStudentsList: 'students-list',
    EntryControlledRoom: 'controlled-room', EntryHistoryModal: 'history-modal',
    EntryQrPanel: 'qr-reader', EntryRecentScans: 'recent-scans',
    EntryStudentsSummary: 'summary', ExamCard: 'exam-card',
  }
  const h = sourceHarness({
    'react-router': { Link: 'link', useParams: () => ({ examId: '17' }), useSearchParams: () => [new URLSearchParams()] },
    '../hooks/useEntryControlStudents': { useEntryControlStudents: () => list },
    '../hooks/useEntryRecentRecords': { useEntryRecentRecords: () => ({ records: [], addResult() {} }) },
    ...Object.fromEntries(Object.entries(components).map(([name, type]) => [`../components/${name}`, { [name]: type }])),
  })
  const { EntryControlPage } = h.load('features/exams/pages/EntryControlPage.tsx')
  let tree
  return {
    h, list,
    render() {
      tree = h.render(() => { const content = EntryControlPage(); return content.type(content.props) })
      return tree
    },
    click(label) {
      const button = nodes(tree, (node) => node.type === 'button' && textContent(node) === label)[0]
      assert.ok(button, label)
      assert.ok(!button.props.disabled, label + ' remains available')
      button.props.onClick()
    },
  }
}

for (const reason of ['EXAM_NOT_STARTED', 'EXAM_ENDED', 'EXAM_FINISHED', 'EXAM_CANCELLED', 'EXAM_STATE_NOT_ALLOWED', 'UNKNOWN']) {
  test(reason + ': queries remain available and the QR reader is never mounted', () => {
    const ui = pageHarness({ ...exam, entry_unavailable_reason: reason })
    let tree = ui.render()
    assert.equal(nodes(tree, (node) => node.type === 'students-list').length, 1)
    ui.click('Registro de asistencia')
    tree = ui.render()
    const manualList = nodes(tree, (node) => node.type === 'students-list')[0]
    assert.equal(manualList.props.manual, true)
    assert.ok(!manualList.props.disabled)
    ui.click('Escanear QR')
    tree = ui.render()
    assert.match(textContent(tree), /Escaneo no disponible/)
    assert.equal(nodes(tree, (node) => node.type === 'qr-reader').length, 0)
    ui.h.jump(24 * 60 * 60 * 1000)
    tree = ui.render()
    assert.equal(nodes(tree, (node) => node.type === 'qr-reader').length, 0, 'Browser clock cannot open entry')
    ui.click('Historial de ingresos')
    tree = ui.render()
    assert.equal(nodes(tree, (node) => node.type === 'history-modal').length, 1)
  })
}

test('QR requires explicit availability from the API and uses the assigned room', () => {
  const ui = pageHarness(undefined)
  ui.render()
  ui.click('Registro de asistencia'); ui.render()
  ui.click('Escanear QR')
  assert.equal(nodes(ui.render(), (node) => node.type === 'qr-reader').length, 0)
  ui.list.response.exam = { ...exam, entry_available: true, entry_unavailable_reason: null }
  const reader = nodes(ui.render(), (node) => node.type === 'qr-reader')[0]
  assert.equal(reader.props.roomId, 7)
  assert.equal(reader.props.active, true)
  ui.list.response.exam = exam
  const tree = ui.render()
  const retainedReader = nodes(tree, (node) => node.type === 'qr-reader')[0]
  assert.ok(retainedReader, 'Retain the camera startup queue after the first authorized mount')
  assert.equal(retainedReader.props.active, false, 'A closed exam must pause the retained reader')
  assert.ok(nodes(tree, (node) => node.type === 'div' && node.props.hidden === true &&
    nodes(node.props.children, (child) => child.type === 'qr-reader').length > 0).length > 0,
  'The retained reader must be hidden while entry is unavailable')
})

for (const [name, currentExam, currentStudent, allowed] of [
  ['before start', exam, student, false],
  ['pending with blockers', { ...exam, entry_available: true }, { ...student, blockers: [{ code: 'EXAM_UNAVAILABLE', message: '' }] }, false],
  ['pending without conditions', { ...exam, entry_available: true }, { ...student, meets_entry_conditions: false }, false],
  ['already registered', { ...exam, entry_available: true }, { ...student, entry_status: 'REGISTERED' }, false],
  ['room mismatch', { ...exam, entry_available: true }, { ...student, controlled_room_id: 8 }, false],
  ['authorized pending student', { ...exam, entry_available: true }, student, true],
]) {
  test('HU27 confirmation: ' + name, async () => {
    const requests = []
    const results = []
    const response = { result: 'AUTHORIZED' }
    const h = sourceHarness({
      '@/features/collaborations/components/CollaborationModal': { CollaborationModal: 'modal' },
      '../api/entryControlApi': { getEntryControlErrorMessage: () => 'Error' },
      '../api/entryManualApi': { registerEntryManually: async (...args) => { requests.push(args); return response } },
    })
    const { EntryManualConfirmationModal } = h.load('features/exams/components/EntryManualConfirmationModal.tsx')
    const tree = h.render(() => EntryManualConfirmationModal({
      exam: currentExam, student: currentStudent, roomId: currentExam.room.id,
      onCancel() {}, onResult: (result) => results.push(result),
    }))
    const confirm = nodes(tree, (node) => node.type === 'button' && textContent(node) === 'Confirmar ingreso')[0]
    assert.equal(confirm.props.disabled, !allowed)
    confirm.props.onClick()
    confirm.props.onClick()
    await settle()
    assert.equal(requests.length, allowed ? 1 : 0, 'No blocked or duplicate request')
    if (allowed) {
      assert.deepEqual(requests[0].slice(0, 3), [17, 23, { room_id: 7 }])
      assert.deepEqual(results, [response])
    }
    h.unmount()
  })
}
