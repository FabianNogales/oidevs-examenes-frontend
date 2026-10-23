import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
} from '../../../shared/tests/sourceHarness.mjs'

function setup() {
  const list = {
    response: { exam: { id: 1, room: { id: 7 }, entry_available: true } },
    roomId: 7,
    reload: () => {},
  }
  const overrides = {
    'react-router': {
      Link: 'Link',
      useParams: () => ({ examId: '1' }),
      useSearchParams: () => [new URLSearchParams()],
    },
    '../hooks/useEntryControlStudents': { useEntryControlStudents: () => list },
    '../hooks/useEntryRecentRecords': {
      useEntryRecentRecords: () => ({ records: [], addResult: () => {} }),
    },
  }
  for (const name of [
    'EntryControlStudentModal',
    'EntryControlStudentsList',
    'EntryControlledRoom',
    'EntryHistoryModal',
    'EntryQrPanel',
    'EntryRecentScans',
    'EntryStudentsSummary',
    'ExamCard',
  ]) {
    overrides[`../components/${name}`] = { [name]: name }
  }
  const h = sourceHarness(overrides)
  h.document.getElementById = () => ({ focus() {} })
  const { EntryControlPage } = h.load(
    'features/exams/pages/EntryControlPage.tsx',
  )
  let tree
  const render = () => {
    tree = h.render(() => {
      const page = EntryControlPage()
      return page.type(page.props)
    })
    return tree
  }
  render()
  return {
    list,
    render,
    scanner: () => nodes(tree, (node) => node.type === 'EntryQrPanel')[0],
    viewStudent: () => {
      nodes(
        tree,
        (node) => node.type === 'EntryControlStudentsList',
      )[0].props.onView(10)
      render()
    },
    modal: (type) => nodes(tree, (node) => node.type === type)[0],
    key: (key) => {
      const tablist = nodes(
        tree,
        (node) =>
          node.props?.['aria-label'] === 'Método de registro de asistencia',
      )[0]
      tablist.props.onKeyDown({ key, preventDefault() {} })
      render()
    },
    click: (label) => {
      const button = nodes(
        tree,
        (node) => node.type === 'button' && textContent(node) === label,
      )[0]
      assert.ok(button, `Missing button: ${label}`)
      assert.ok(!button.props.disabled, `Disabled button: ${label}`)
      button.props.onClick()
      render()
    },
  }
}

test('entry: switching methods and main tabs pauses the retained scanner instead of remounting it', () => {
  const h = setup()
  assert.equal(h.scanner(), undefined)
  h.click('Registro de asistencia')
  assert.equal(
    h.scanner(),
    undefined,
    'Manual attendance must not initialize the camera',
  )
  h.click('Escanear QR')
  const scannerType = h.scanner().type
  assert.equal(h.scanner().props.active, true)
  assert.equal(h.scanner().props.roomId, 7)
  h.click('Registro manual')
  assert.ok(
    h.scanner(),
    'Keep the hook instance and its pending camera startup queue',
  )
  assert.equal(h.scanner().type, scannerType)
  assert.equal(h.scanner().props.active, false)
  h.click('Escanear QR')
  assert.equal(h.scanner().props.active, true)
  h.click('Verificación')
  assert.equal(h.scanner().props.active, false)
  h.click('Registro de asistencia')
  assert.equal(
    h.scanner().props.active,
    false,
    'Returning to attendance starts in manual mode',
  )
  h.click('Escanear QR')
  assert.equal(h.scanner().props.active, true)
})

test('entry: keyboard method navigation uses the same camera activation lifecycle', () => {
  const h = setup()
  h.click('Registro de asistencia')
  h.key('End')
  assert.equal(h.scanner().props.active, true)
  h.key('Home')
  assert.equal(h.scanner().props.active, false)
  h.key('ArrowRight')
  assert.equal(h.scanner().props.active, true)
})

test('entry: history and student modals pause scanning and closing them resumes it', () => {
  const h = setup()
  h.click('Registro de asistencia')
  h.click('Escanear QR')
  h.click('Historial de ingresos')
  assert.equal(h.scanner().props.active, false)
  h.modal('EntryHistoryModal').props.onClose()
  h.render()
  assert.equal(h.scanner().props.active, true)
  h.click('Registro manual')
  h.viewStudent()
  h.click('Escanear QR')
  assert.equal(h.scanner().props.active, false)
  h.modal('EntryControlStudentModal').props.onClose()
  h.render()
  assert.equal(h.scanner().props.active, true)
})

test('entry: refreshed availability pauses the retained scanner and prevents starts for unavailable exams', () => {
  const h = setup()
  h.click('Registro de asistencia')
  h.click('Escanear QR')
  h.list.response.exam.entry_available = false
  h.list.response.exam.entry_unavailable_reason = 'EXAM_ENDED'
  const tree = h.render()
  assert.ok(
    h.scanner(),
    'Retain camera serialization while availability changes',
  )
  assert.equal(h.scanner().props.active, false)
  assert.match(textContent(tree), /El examen ya finalizó/)
  h.list.response.exam.entry_available = true
  h.render()
  assert.equal(h.scanner().props.active, true)

  const unavailable = setup()
  unavailable.list.response.exam.entry_available = false
  unavailable.click('Registro de asistencia')
  unavailable.click('Escanear QR')
  assert.equal(unavailable.scanner(), undefined)
})

test('entry: missing API availability cannot start QR and pauses an already authorized reader', () => {
  const h = setup()
  h.list.response.exam = undefined
  h.click('Registro de asistencia')
  h.click('Escanear QR')
  assert.equal(h.scanner(), undefined)
  h.list.response.exam = { id: 1, room: { id: 7 } }
  h.render()
  assert.equal(
    h.scanner(),
    undefined,
    'A missing flag cannot authorize the first mount',
  )
  h.list.response.exam.entry_available = true
  h.render()
  assert.equal(h.scanner().props.active, true)
  for (const availability of [undefined, null, false]) {
    h.list.response.exam.entry_available = availability
    const tree = h.render()
    assert.ok(
      h.scanner(),
      'Retain the camera startup queue after its first authorized use',
    )
    assert.equal(h.scanner().props.active, false)
    assert.ok(
      nodes(
        tree,
        (node) =>
          node.type === 'div' &&
          node.props.hidden === true &&
          nodes(node.props.children, (child) => child.type === 'EntryQrPanel')
            .length > 0,
      ).length > 0,
      'The retained reader must be hidden while availability is not explicitly true',
    )
  }
  h.list.response.exam.entry_available = true
  h.render()
  assert.equal(h.scanner().props.active, true)
})

test('entry: an open student modal receives each refreshed exam context', () => {
  const h = setup()
  h.viewStudent()
  assert.equal(
    h.modal('EntryControlStudentModal').props.examContext,
    h.list.response.exam,
  )
  const refreshed = {
    ...h.list.response.exam,
    entry_available: false,
    entry_unavailable_reason: 'EXAM_ENDED',
  }
  h.list.response.exam = refreshed
  h.render()
  assert.equal(h.modal('EntryControlStudentModal').props.examContext, refreshed)
})

test('entry: an in-flight QR registration keeps method changes disabled', () => {
  const h = setup()
  h.click('Registro de asistencia')
  h.click('Escanear QR')
  h.scanner().props.onProcessingChange(true)
  const tree = h.render()
  const methods = nodes(
    tree,
    (node) => node.props?.['aria-label'] === 'Método de registro de asistencia',
  )[0]
  assert.ok(
    nodes(methods, (node) => node.type === 'button').every(
      (node) => node.props.disabled,
    ),
  )
  h.key('Home')
  assert.equal(h.scanner().props.active, true)
})
