import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle, sourceRoot } from '../../../shared/tests/sourceHarness.mjs'

const student = { student_id: 23, first_names: 'Ana María', last_names: 'Prueba', sis_code: '00123', identity_number: 'CI-123' }
const historical = '/photos/historical-23.jpg'
const current = '/photos/current-23.jpg'

function expand(node) {
  if (Array.isArray(node)) return node.map(expand)
  if (!node || typeof node !== 'object' || !node.props) return node
  if (['EntryHistoryRecords', 'EntryQrStudentIdentity', 'EntryStudentPhotos', 'IdentityPhoto', 'AuthenticatedImage'].includes(node.type?.name)) return expand(node.type(node.props))
  return { ...node, props: { ...node.props, children: expand(node.props.children) } }
}

function identity(photos) {
  const h = photoHarness()
  const { EntryQrStudentIdentity } = h.load('features/exams/components/EntryQrStudentIdentity.tsx')
  const props = { student: { ...student, ...photos } }
  let tree
  const render = () => { tree = h.render(() => expand(EntryQrStudentIdentity(props))); return tree }
  render()
  return { h, props, render, get tree() { return tree } }
}

// Field selection is tested here; authenticated transport/lifecycle has separate tests.
function photoHarness(overrides = {}) {
  return sourceHarness({
    '@/shared/hooks/useAuthenticatedImage': { useAuthenticatedImage: url => ({ src: url, loading: false, failed: false }) },
    ...overrides,
  })
}

for (const [name, photos, expected, missing] of [
  ['both available with different URLs', { historical_photo_url: historical, profile_photo_url: current }, [historical, current], []],
  ['historical null never falls back to current', { historical_photo_url: null, profile_photo_url: current }, [current], ['Sin fotografía histórica']],
  ['current null never falls back to historical', { historical_photo_url: historical, profile_photo_url: null }, [historical], ['Sin fotografía actual']],
  ['both null', { historical_photo_url: null, profile_photo_url: null }, [], ['Sin fotografía histórica', 'Sin fotografía actual']],
  ['historical omitted during integration', { profile_photo_url: current }, [current], ['Sin fotografía histórica']],
  ['both omitted during integration', {}, [], ['Sin fotografía histórica', 'Sin fotografía actual']],
  ['current omitted', { historical_photo_url: historical }, [historical], ['Sin fotografía actual']],
]) {
  test(`HU14 photos: ${name}`, () => {
    const ui = identity(photos)
    const figures = nodes(ui.tree, (node) => node.type === 'figure')
    assert.equal(figures.length, 2)
    assert.deepEqual(figures.map((figure) => nodes(figure, (node) => node.type === 'figcaption').map(textContent)[0]), ['Foto histórica', 'Foto actual'])
    assert.deepEqual(nodes(ui.tree, (node) => node.type === 'img').map((node) => node.props.src), expected)
    for (const placeholder of missing) assert.ok(textContent(ui.tree).includes(placeholder))
    assert.equal(nodes(ui.tree, (node) => node.props?.role === 'img').length, missing.length)
    for (const text of ['Ana María Prueba', 'SIS: 00123', 'CI: CI-123']) assert.ok(textContent(ui.tree).includes(text))
    if (photos.historical_photo_url) assert.equal(nodes(figures[0], (node) => node.type === 'img')[0].props.src, photos.historical_photo_url)
    if (photos.profile_photo_url) assert.equal(nodes(figures[1], (node) => node.type === 'img')[0].props.src, photos.profile_photo_url)
    ui.h.unmount()
  })
}

test('HU14 photos: slot meaning comes exclusively from its field, never from the URL name', () => {
  const ui = identity({ historical_photo_url: '/photos/current.jpg', profile_photo_url: '/photos/historical.jpg' })
  const images = nodes(ui.tree, (node) => node.type === 'img')
  assert.deepEqual(images.map((node) => [node.props.src, node.props.alt]), [
    ['/photos/current.jpg', 'Foto histórica de Ana María Prueba'],
    ['/photos/historical.jpg', 'Foto actual de Ana María Prueba'],
  ])
  ui.h.unmount()
})

for (const failed of ['historical', 'current']) {
  test(`HU14 photos: broken ${failed} image gets only its own placeholder`, () => {
    const ui = identity({ historical_photo_url: historical, profile_photo_url: current })
    nodes(ui.tree, (node) => node.type === 'img')[failed === 'historical' ? 0 : 1].props.onError()
    ui.render()
    assert.deepEqual(nodes(ui.tree, (node) => node.type === 'img').map((node) => node.props.src), [failed === 'historical' ? current : historical])
    assert.ok(textContent(ui.tree).includes(failed === 'historical' ? 'Sin fotografía histórica' : 'Sin fotografía actual'))
    ui.h.unmount()
  })
}

test('HU14 photos: changing the student response removes old pictures instead of keeping cached fallbacks', () => {
  const ui = identity({ historical_photo_url: historical, profile_photo_url: current })
  ui.props.student = { ...student, student_id: 24, historical_photo_url: null, profile_photo_url: null }
  ui.render()
  assert.equal(nodes(ui.tree, (node) => node.type === 'img').length, 0)
  assert.ok(textContent(ui.tree).includes('Sin fotografía histórica'))
  assert.ok(textContent(ui.tree).includes('Sin fotografía actual'))
  ui.h.unmount()
})

for (const result of ['AUTHORIZED', 'ALREADY_REGISTERED', 'DENIED']) {
  test(`HU14 QR result ${result}: one compact identity preserves result, message, time, SIS and CI`, () => {
    const h = photoHarness()
    const { EntryQrResultPanel } = h.load('features/exams/components/EntryQrResultPanel.tsx')
    const response = { result, message: 'Mensaje exacto del backend.', processed_at: '2026-10-31T10:00:00-04:00',
      data: { student: { ...student, historical_photo_url: historical, profile_photo_url: current } } }
    const tree = h.render(() => expand(EntryQrResultPanel({ response, processing: false })))
    assert.equal(nodes(tree, (node) => node.type === 'img').length, 2)
    assert.equal(nodes(tree, (node) => node.type === 'h3' && textContent(node) === 'Ana María Prueba').length, 1)
    assert.ok(textContent(tree).includes('Último escaneo'))
    assert.ok(textContent(tree).includes(response.message))
    assert.ok(textContent(tree).includes(result === 'AUTHORIZED' ? 'Ingreso registrado' : result === 'ALREADY_REGISTERED' ? 'Ingreso ya registrado' : 'Incidencia'))
    assert.ok(textContent(tree).includes('SIS: 00123'))
    assert.ok(textContent(tree).includes('CI: CI-123'))
    assert.equal(nodes(tree, (node) => node.type === 'time')[0].props.dateTime, response.processed_at)
    assert.equal(nodes(tree, (node) => node.type === 'button').length, 0)
    assert.doesNotMatch(textContent(tree), /Condiciones de ingreso|Registros recientes|Estado de ingreso/)
    h.unmount()
  })
}

test('HU14 QR result with no student does not fabricate an identity', () => {
  const h = photoHarness()
  const { EntryQrResultPanel } = h.load('features/exams/components/EntryQrResultPanel.tsx')
  const tree = h.render(() => expand(EntryQrResultPanel({ response: { result: 'INVALID_QR', message: 'QR inválido.', processed_at: '2026-10-31T10:00:00-04:00', data: null }, processing: false })))
  assert.equal(nodes(tree, (node) => node.type === 'figure' || node.type === 'img' || node.type === 'h3').length, 0)
  assert.match(textContent(tree), /QR inválido/)
  h.unmount()
})

test('HU14 unchanged QR API accepts old and new photo contracts and registers exactly one POST per request', async () => {
  const calls = []
  let identity = { ...student, profile_photo_url: current }
  const h = sourceHarness({ '@/shared/api/httpClient': { httpClient: { post: async (...args) => {
    calls.push(args)
    return { status: 201, data: { result: 'AUTHORIZED', message: 'Ingreso registrado.', processed_at: '2026-10-31T10:00:00-04:00', data: { student: identity } } }
  } } } })
  const { processEntryQr } = h.load('features/exams/api/entryQrApi.ts')
  const payload = { qr_token: 'token-de-prueba', room_id: 7 }
  let response = await processEntryQr(17, payload)
  assert.equal(response.data.student.historical_photo_url, undefined)
  identity = { ...student, profile_photo_url: current, historical_photo_url: historical }
  response = await processEntryQr(17, payload)
  assert.equal(response.data.student.historical_photo_url, historical)
  assert.equal(response.data.student.profile_photo_url, current)
  await settle()
  assert.equal(calls.length, 2)
  for (const [url, body] of calls) { assert.equal(url, '/exams/17/entry-control/qr'); assert.deepEqual(body, payload) }
})

test('HU14 photo layout is bounded and can wrap only the photo columns in narrow spaces', () => {
  const css = readFileSync(resolve(sourceRoot, 'features/exams/components/EntryQr.module.css'), 'utf8')
  assert.match(css, /repeat\(auto-fit, minmax\(min\(100%, 64px\), 1fr\)\)/)
  assert.match(css, /max-width: 152px/)
  assert.match(css, /max-width: 72px/)
  const types = readFileSync(resolve(sourceRoot, 'features/exams/types/entryControl.types.ts'), 'utf8')
  assert.match(types, /historical_photo_url\?: string \| null/)
  assert.match(types, /profile_photo_url\?: string \| null/)
})

test('HU14 Manual result renders independent photos, name, SIS and CI from backend identity', () => {
  const h = photoHarness()
  const { EntryResultPanel } = h.load('features/exams/components/EntryResultPanel.tsx')
  const tree = h.render(() => expand(EntryResultPanel({ processing: false, method: 'MANUAL', response: {
    result: 'AUTHORIZED', message: 'Registro confirmado.', processed_at: '2026-11-01T20:00:00Z',
    data: { student: { ...student, historical_photo_url: historical, profile_photo_url: current } },
  } })))
  // Expand the identity supplied by the real result component.
  assert.equal(nodes(tree, node => node.props?.['aria-label'] === 'Resultado del registro manual').length, 1)
  assert.deepEqual(nodes(tree, node => node.type === 'img').map(node => node.props.src), [historical, current])
  for (const value of ['Ana María Prueba', 'SIS: 00123', 'CI: CI-123']) assert.ok(textContent(tree).includes(value))
  h.unmount()
})

test('HU14 Verification detail supplies both distinct photos and retains identification', async () => {
  const exam = { id: 17, name: 'Parcial', subject_name: 'Materia', room: { id: 7 }, exam_date: '2026-11-01', start_time: '12:00:00', entry_available: true }
  const h = photoHarness({
    'react-dom': { createPortal: content => content },
    '@/features/collaborations/components/CollaborationModal': { CollaborationModal: 'modal' },
    '../api/entryControlApi': { getEntryControlStudent: async () => ({ exam, data: {
      ...student, historical_photo_url: historical, profile_photo_url: current,
      student_status: 'ACTIVE', enrollment_status: 'ACTIVE', eligibility_status: 'ELIGIBLE',
      room_status: 'MATCH', entry_status: 'PENDING', blockers: [],
    } }), getEntryControlErrorMessage: () => 'Error' },
    './EntryManualConfirmationModal': { EntryManualConfirmationModal: 'confirmation' },
  })
  const { EntryControlStudentModal } = h.load('features/exams/components/EntryControlStudentModal.tsx')
  h.render(() => expand(EntryControlStudentModal({ examId: 17, studentId: 23, roomId: 7, onClose() {} })))
  await settle(); const tree = h.render()
  assert.deepEqual(nodes(tree, node => node.type === 'img').map(node => node.props.src), [historical, current])
  for (const value of ['Ana María Prueba', 'SIS:', '00123', 'CI:', 'CI-123']) assert.ok(textContent(tree).includes(value))
  h.unmount()
})

test('HU14 history uses the backend student photos in desktop and mobile records', async () => {
  const h = photoHarness({
    '@/features/entry-annulments/components/AnnulEntryConfirmation': { AnnulEntryConfirmation: 'annulment-confirmation' },
    '@/features/collaborations/components/CollaborationModal': { CollaborationModal: 'modal' },
    '../api/entryControlApi': { getEntryControlErrorMessage: () => 'Error' },
    '../api/entryQrApi': { getEntryHistory: async () => ({ data: [{
      student: { ...student, historical_photo_url: historical, profile_photo_url: current },
      entry: { id: 1, status: 'VALID', entered_at: '2026-11-01T20:00:00Z', verification_method: 'MANUAL' },
    }], meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 } }) },
  })
  const { EntryHistoryModal } = h.load('features/exams/components/EntryHistoryModal.tsx')
  h.render(() => expand(EntryHistoryModal({ examId: 17, onClose() {} })))
  h.advance(300); await settle()
  const tree = h.render()
  assert.equal(nodes(tree, node => node.type === 'img').length, 4)
  assert.ok(textContent(tree).includes('CI: CI-123'))
  h.unmount()
})
