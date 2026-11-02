import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

const exam = { id: 1, subject_name: 'Materia real', name: 'Primer parcial', status: 'ACTIVE',
  exam_date: '2026-10-29', start_time: '19:00:00', duration_minutes: 90, evaluation_type: 'partial',
  room: { id: 7, name: 'Aula G17', code: 'DEV-AULA-1', location: 'Bloque A' }, entry_available: true }
const summary = { total_students: 30, registered: 10, pending: 20, not_applicable: 0 }

function pageHarness() {
  const pendingOnlyModes = []
  const notifications = []
  let reloads = 0
  const list = { response: { exam, summary }, roomId: 7, query: '', filter: 'all',
    filterCounts: { all: 30, registered: 10, pending: 20, incidents: 2 },
    setFilter: value => { list.filter = value }, setPage() {}, reload() { reloads++ } }
  const overrides = {
    '@/features/incidents/components/IncidentControlDialog': { IncidentControlDialog: 'incident-dialog' },
    'react-router': { Link: 'Link', useParams: () => ({ examId: '1' }), useSearchParams: () => [new URLSearchParams('from=teacher')] },
    '@/features/collaborations/components/CollaborationModal': { CollaborationModal: 'success-modal' },
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify: (...notice) => notifications.push(notice) }) },
    '../hooks/useEntryControlStudents': {
      useEntryControlStudents: (_examId, pendingOnly) => {
        pendingOnlyModes.push(pendingOnly)
        return list
      },
    },
  }
  for (const name of ['EntryControlStudentsList', 'EntryControlStudentModal', 'EntryQrPanel',
    'EntryStudentsSummary', 'EntryControlExamHeader']) overrides[`../components/${name}`] = { [name]: name }
  overrides['@/shared/hooks/useAuthenticatedImage'] = { useAuthenticatedImage: () => ({ src: null, loading: false, failed: false }) }
  const h = sourceHarness(overrides), { EntryControlPage } = h.load('features/exams/pages/EntryControlPage.tsx')
  let tree
  const render = () => tree = h.render(() => { const content = EntryControlPage(); return content.type(content.props) })
  render()
  const click = label => {
    const button = nodes(tree, n => n.type === 'button' && textContent(n).trim() === label)[0]
    assert.ok(button, label); button.props.onClick(); return render()
  }
  return { h, list, pendingOnlyModes, notifications, render, click, reloads: () => reloads, tree: () => tree }
}

test('entry presentation: one global summary remains outside both main panels; search never supplies global incidents', () => {
  const p = pageHarness()
  for (const query of ['', 'Ana', '   ']) {
    p.list.query = query
    const tree = p.render(), summaries = nodes(tree, n => n.type === 'EntryStudentsSummary')
    assert.equal(summaries.length, 1)
    assert.equal(summaries[0].props.summary, summary)
    assert.equal(summaries[0].props.incidents, query.trim() ? undefined : 2)
    for (const panel of nodes(tree, n => n.props?.role === 'tabpanel')) {
      assert.equal(nodes(panel, n => n.type === 'EntryStudentsSummary').length, 0)
    }
  }
  p.list.query = ''; p.list.filterCounts = null
  assert.equal(nodes(p.render(), n => n.type === 'EntryStudentsSummary')[0].props.incidents, undefined)
  p.h.unmount()
})

test('entry presentation: zero total yields a finite empty progress and no fabricated incident count', () => {
  const h = sourceHarness(), { EntryStudentsSummary } = h.load('features/exams/components/EntryStudentsSummary.tsx')
  const tree = h.render(() => EntryStudentsSummary({ summary: { ...summary, total_students: 0, registered: 0, pending: 0 } }))
  assert.match(textContent(tree), /0 de 0 registrados · 0%/)
  assert.doesNotMatch(textContent(tree), /incidencias|NaN|Infinity/)
  const progress = nodes(tree, n => n.type === 'progress')[0]
  assert.equal(progress.props.max, 1); assert.equal(progress.props.value, 0)
})

test('entry presentation: compact header preserves exam metadata and the additional room location', () => {
  const h = sourceHarness(), { EntryControlExamHeader } = h.load('features/exams/components/EntryControlExamHeader.tsx')
  const tree = h.render(() => EntryControlExamHeader({ exam }))
  for (const text of ['Materia real · Primer parcial', 'Activo', '19:00', '90 min', 'Aula G17 (DEV-AULA-1)', 'Bloque A', 'Parcial']) {
    assert.ok(textContent(tree).includes(text), text)
  }
})

test('entry presentation: shared toolbar forwards search/group/page to the existing list callbacks', () => {
  const calls = []
  const h = sourceHarness({ './EntryControlTable': { EntryControlTable: 'table' } })
  const { EntryControlStudentsList } = h.load('features/exams/components/EntryControlStudentsList.tsx')
  const tree = h.render(() => EntryControlStudentsList({ onView() {}, list: {
    response: { exam, summary }, query: '', filter: 'all', filterCounts: { all: 30, registered: 10, pending: 20, incidents: 2 },
    items: [], loading: false, error: null, meta: { current_page: 1, last_page: 3, per_page: 10, total: 30 },
    setQuery: value => calls.push(['search', value]), setFilter: value => calls.push(['group', value]), setPage: value => calls.push(['page', value]),
  } }))
  nodes(tree, n => n.type === 'input')[0].props.onChange({ target: { value: 'Ana' } })
  nodes(tree, n => n.type === 'button' && textContent(n).startsWith('Pendientes'))[0].props.onClick()
  nodes(tree, n => n.type === 'button' && textContent(n) === 'Siguiente')[0].props.onClick()
  assert.deepEqual(calls, [['search', 'Ana'], ['group', 'pending'], ['page', 2]])
  assert.equal(nodes(tree, n => n.type === 'h2').length, 0)
})

test('entry presentation: Manual always queries Pending, has no group selector, and verification retains its selected group', () => {
  const p = pageHarness()
  const list = () => nodes(p.tree(), n => n.type === 'EntryControlStudentsList')[0]
  list().props.onFilterChange('incidents'); p.render()
  assert.equal(p.list.filter, 'incidents')
  p.click('Registro de asistencia')
  assert.equal(p.pendingOnlyModes.at(-1), true)
  assert.equal(list().props.manual, true)
  assert.equal(list().props.onFilterChange, undefined)
  assert.equal(nodes(p.tree(), n => n.props?.['aria-label'] === 'Filtrar estudiantes por ingreso').length, 0)
  p.click('Escanear QR')
  p.click('Manual')
  assert.equal(p.pendingOnlyModes.at(-1), true)
  assert.equal(list().props.manual, true)
  p.click('Verificación')
  assert.equal(p.pendingOnlyModes.at(-1), false)
  assert.equal(p.list.filter, 'incidents')
  assert.equal(list().props.manual, undefined)
  p.click('Registro de asistencia')
  assert.equal(p.pendingOnlyModes.at(-1), true)
  p.h.unmount()
})

test('entry presentation: verification filter labels do not render counts or dashes', () => {
  const h = sourceHarness({ './EntryControlTable': { EntryControlTable: 'table' } })
  const { EntryControlStudentsList } = h.load('features/exams/components/EntryControlStudentsList.tsx')
  const tree = h.render(() => EntryControlStudentsList({ onView() {}, list: {
    response: { exam, summary }, query: '', filter: 'all',
    filterCounts: { all: 30, registered: 10, pending: 20, incidents: 2 },
    items: [], loading: false, error: null, meta: null, setQuery() {}, setFilter() {}, setPage() {},
  } }))
  const labels = nodes(tree, n => n.type === 'button' && n.props?.['aria-pressed'] !== undefined)
    .map(textContent)
  assert.deepEqual(labels, ['Todos', 'Registrados', 'Pendientes', 'Incidencias'])
  assert.doesNotMatch(labels.join(' '), /—|–/)
})

test('entry presentation: Manual hides eligibility without enabling a blocked Pending student or bypassing the existing action', () => {
  const h = sourceHarness({ './EntryControlTable': { EntryControlTable: 'table' } })
  const { EntryControlStudentsList } = h.load('features/exams/components/EntryControlStudentsList.tsx')
  const actual = sourceHarness(), { EntryControlTable } = actual.load('features/exams/components/EntryControlTable.tsx')
  const eligible = { student_id: 1, first_names: 'Ana', last_names: 'Real', sis_code: '00123',
    student_status: 'ACTIVE', enrollment_status: 'ACTIVE', eligibility_status: 'ELIGIBLE',
    controlled_room_id: 7, room_status: 'MATCH', entry_status: 'PENDING', meets_entry_conditions: true, blockers: [] }
  const selected = []
  const list = { response: { exam, summary }, roomId: 7, query: '', filter: 'pending', items: [eligible,
    { ...eligible, student_id: 2, meets_entry_conditions: false, blockers: [{ code: 'INELIGIBLE', message: 'No habilitado' }] }], meta: null }
  const tree = h.render(() => EntryControlStudentsList({ list, manual: true, onView: id => selected.push(id) }))
  assert.equal(nodes(tree, n => n.props?.['aria-label'] === 'Filtrar estudiantes por ingreso').length, 0)
  assert.doesNotMatch(textContent(tree), /Todos|Registrados|Pendientes|Incidencias/)
  assert.doesNotMatch(textContent(tree), /Los contadores corresponden/)
  assert.equal(nodes(tree, n => n.type === 'input')[0].props.placeholder, 'Nombre, apellido, SIS o CI')
  const props = nodes(tree, n => n.type === 'table')[0].props
  const table = actual.render(() => EntryControlTable(props))
  assert.equal(nodes(table, n => n.type === 'th').length, 5)
  assert.doesNotMatch(textContent(table), /Habilitación/)
  const buttons = nodes(table, n => n.type === 'button')
  assert.equal(textContent(buttons[0]), 'Registrar'); assert.equal(buttons[0].props.disabled, false)
  assert.equal(buttons[1].props.disabled, true)
  buttons[0].props.onClick(); assert.deepEqual(selected, [1])
  list.response = { exam: { ...exam, entry_available: false }, summary }
  const unavailable = h.render(() => EntryControlStudentsList({ list, manual: true, onView() {} }))
  assert.equal(nodes(unavailable, n => n.type === 'table')[0].props.canRegister(eligible), false)
})

test('entry presentation: last scan retains one backend identity, result, time and message without redundant blocks', () => {
  const h = sourceHarness({ '@/shared/hooks/useAuthenticatedImage': { useAuthenticatedImage: () => ({ src: null, loading: false, failed: false }) } }), { EntryQrResultPanel } = h.load('features/exams/components/EntryQrResultPanel.tsx')
  let tree = h.render(() => EntryQrResultPanel({ response: null, processing: false }))
  assert.match(textContent(tree), /Último escaneoAún no hay escaneos.Presenta un QR frente a la cámara./)
  assert.equal(nodes(tree, n => n.type === 'img' || n.type === 'time').length, 0)
  const response = { result: 'DENIED', message: 'Motivo exacto recibido del servidor.', processed_at: '2026-10-29T19:00:00Z',
    data: { student: { student_id: 1, first_names: 'Ana', last_names: 'Real', sis_code: '00123', identity_number: 'CI-SECRET', profile_photo_url: '/profile.jpg' } } }
  tree = h.render(() => EntryQrResultPanel({ response, processing: false }))
  assert.match(textContent(tree), /Último escaneoIncidencia/)
  const identities = nodes(tree, n => n.type?.name === 'EntryQrStudentIdentity')
  assert.equal(identities.length, 1)
  assert.equal(identities[0].props.student, response.data.student)
  const identity = h.render(() => identities[0].type(identities[0].props))
  assert.match(textContent(identity), /Ana RealSIS: 00123CI: CI-SECRET/)
  assert.ok(textContent(tree).includes(response.message))
  assert.equal(nodes(tree, n => n.type === 'time')[0].props.dateTime, response.processed_at)
  assert.doesNotMatch(textContent(tree), /Foto de perfil|Condiciones de ingreso|Registros recientes/)
})

test('entry presentation: camera badge uses camera.state, including missing stream while QR mode is active', () => {
  let state = 'missing'
  const h = sourceHarness({
    '@/shared/hooks/useAuthenticatedImage': { useAuthenticatedImage: () => ({ src: null, loading: false, failed: false }) },
    '../api/entryControlApi': { getEntryControlErrorMessage: () => 'Error' },
    '../api/entryQrApi': { processEntryQr: () => { throw new Error('No scan expected in camera presentation test') } },
    '../hooks/useEntryQrCamera': { useEntryQrCamera: () => ({
    state, message: 'Mensaje específico de la cámara.', videoRef: { current: null }, devices: [],
    pause() {}, resume() {},
  }) } })
  const { EntryQrPanel } = h.load('features/exams/components/EntryQrPanel.tsx')
  for (const [next, label] of [['missing', 'Sin señal'], ['active', 'Activa'], ['paused', 'Pausada'], ['loading', 'Cargando…'], ['denied', 'Sin señal']]) {
    state = next
    const tree = h.render(() => EntryQrPanel({ examId: 1, roomId: 7, active: true, onProcessed() {}, onProcessingChange() {} }))
    assert.ok(nodes(tree, n => n.props?.role === 'status').some(n => textContent(n) === label), next)
    if (next === 'denied') assert.match(textContent(tree), /Mensaje específico de la cámara/)
  }
  h.unmount()
})

test('entry presentation: QR mode has no session recent-records section', () => {
  const p = pageHarness()
  p.click('Registro de asistencia')
  p.click('Escanear QR')
  const tree = p.tree()
  assert.equal(nodes(tree, n => n.type === 'EntryRecentScans').length, 0)
  assert.doesNotMatch(textContent(tree), /Registros recientes de esta sesión|Mostrar menos|Ver \d+ registros más/)
  p.h.unmount()
})

function studentModalHarness(student) {
  const examContext = {
    ...exam,
    entry_opens_at: null,
    entry_closes_at: null,
    server_time: '2026-10-29T18:00:00Z',
    entry_unavailable_reason: null,
  }
  const h = sourceHarness({
    '@/shared/hooks/useAuthenticatedImage': { useAuthenticatedImage: () => ({ src: null, loading: false, failed: false }) },
    'react-dom': { createPortal: (content) => content },
    '@/features/auth/components/AuthIcons': { UserIcon: 'user-icon' },
    '@/features/collaborations/components/CollaborationModal': {
      CollaborationModal: 'collaboration-modal',
    },
    '../api/entryControlApi': {
      getEntryControlStudent: async () => ({ exam: examContext, data: student }),
      getEntryControlErrorMessage: () => 'Error',
    },
    './EntryManualConfirmationModal': { EntryManualConfirmationModal: 'confirm-modal' },
    './EntryResultPanel': { EntryResultPanel: 'entry-result' },
  })
  const { EntryControlStudentModal } = h.load(
    'features/exams/components/EntryControlStudentModal.tsx',
  )
  const props = { examId: 1, studentId: student.student_id, roomId: 7, examContext, onClose() {} }
  const render = () => h.render(() => EntryControlStudentModal(props))
  render()
  return { h, render }
}

const modalStudent = {
  student_id: 23,
  first_names: 'Ana',
  last_names: 'Prueba',
  sis_code: '00123',
  identity_number: 'CI-123',
  profile_photo_url: null,
  student_status: 'ACTIVE',
  enrollment_status: 'ACTIVE',
  eligibility_status: 'ELIGIBLE',
  reason_code: null,
  reason: null,
  observations: null,
  assigned_room_id: 7,
  controlled_room_id: 7,
  room_status: 'MATCH',
  entry_status: 'PENDING',
  entry: null,
  meets_entry_conditions: true,
  blockers: [],
}

test('student modal: pending students show basic data and entry conditions without an entry-status block', async () => {
  const h = studentModalHarness(modalStudent)
  await settle()
  const tree = h.render()
  assert.match(textContent(tree), /Ana Prueba/)
  assert.match(textContent(tree), /00123/)
  assert.match(textContent(tree), /Primer parcial/)
  assert.equal(nodes(tree, (node) => node.props?.['aria-label'] === 'Condiciones de ingreso').length, 1)
  assert.equal(nodes(tree, (node) => node.props?.['aria-label'] === 'Ingreso registrado').length, 0)
  assert.doesNotMatch(textContent(tree), /Estado de ingreso|Pendiente/)
  h.h.unmount()
})

test('student modal: registered students get one primary entry block and hide routine conditions', async () => {
  const h = studentModalHarness({
    ...modalStudent,
    entry_status: 'REGISTERED',
    entry: {
      id: 8,
      entered_at: '2026-10-29T22:34:00Z',
      verification_method: 'MANUAL',
      verified_by: 2,
      verified_by_name: 'Docente Principal Demo',
    },
  })
  await settle()
  const tree = h.render()
  assert.equal(nodes(tree, (node) => node.props?.['aria-label'] === 'Ingreso registrado').length, 1)
  assert.equal(nodes(tree, (node) => node.props?.['aria-label'] === 'Condiciones de ingreso').length, 0)
  assert.match(textContent(tree), /Ingreso registrado/)
  assert.match(textContent(tree), /MANUAL/)
  assert.match(textContent(tree), /Docente Principal Demo/)
  assert.doesNotMatch(textContent(tree), /Estado de ingreso|Condiciones de ingreso/)
  h.h.unmount()
})

test('student modal: registered students retain real blockers but ignore global availability blockers', async () => {
  const h = studentModalHarness({
    ...modalStudent,
    entry_status: 'REGISTERED',
    eligibility_status: 'INELIGIBLE',
    reason: 'Inhabilitación reportada.',
    entry: {
      id: 8,
      entered_at: '2026-10-29T22:34:00Z',
      verification_method: 'QR',
      verified_by: 2,
      verified_by_name: 'Docente',
    },
    blockers: [
      { code: 'INELIGIBLE', message: 'Inhabilitación reportada.' },
      { code: 'EXAM_UNAVAILABLE', message: 'EXAM_UNAVAILABLE' },
    ],
  })
  await settle()
  const tree = h.render()
  assert.equal(nodes(tree, (node) => node.props?.['aria-label'] === 'Condiciones de ingreso').length, 1)
  assert.match(textContent(tree), /Observaciones del control de ingreso/)
  assert.match(textContent(tree), /Inhabilitación reportada/)
  assert.doesNotMatch(textContent(tree), /El examen no se encuentra disponible/)
  h.h.unmount()
})

test('entry presentation: successful Manual and QR registrations refetch the shared server list', () => {
  const p = pageHarness()
  p.click('Registro de asistencia')
  const manualList = nodes(p.tree(), n => n.type === 'EntryControlStudentsList')[0]
  manualList.props.onView(23)
  p.render()
  const manualModal = nodes(p.tree(), n => n.type === 'EntryControlStudentModal')[0]
  const student = { student_id: 23, first_names: 'Ana Estudiante', last_names: 'Demo' }
  manualModal.props.onManualResult({
    result: 'AUTHORIZED', message: 'Ingreso registrado', processed_at: '2026-10-29T19:00:00Z', data: null,
  }, student)
  let tree = p.render()
  assert.equal(p.reloads(), 1)
  assert.equal(p.pendingOnlyModes.at(-1), true)
  assert.deepEqual(p.notifications, [])
  assert.equal(nodes(p.tree(), n => n.type === 'EntryControlStudentModal').length, 0,
    'Successful Manual registration closes the detail and confirmation modals')
  let successModal = nodes(tree, n => n.type === 'success-modal')[0]
  assert.ok(successModal, 'A single final success modal is shown')
  assert.equal(successModal.props.title, 'Ingreso registrado')
  assert.match(textContent(successModal), /Ana Estudiante Demo fue registrada para el examen/)
  assert.equal(nodes(successModal, n => n.type === 'button' && textContent(n) === 'Cerrar').length, 1)
  successModal.props.onClose()
  tree = p.render()
  assert.equal(nodes(tree, n => n.type === 'success-modal').length, 0)

  p.click('Escanear QR')
  const qrPanel = nodes(p.tree(), n => n.type === 'EntryQrPanel')[0]
  qrPanel.props.onProcessed({
    result: 'AUTHORIZED', message: 'Ingreso registrado', processed_at: '2026-10-29T19:00:00Z', data: null,
  })
  assert.equal(p.reloads(), 2)
  assert.equal(p.pendingOnlyModes.at(-1), true)
  assert.equal(p.notifications.length, 0, 'QR feedback remains in the latest-scan panel')
  p.h.unmount()
})
