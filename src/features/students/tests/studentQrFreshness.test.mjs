import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, settle } from '../../../shared/tests/sourceHarness.mjs'

// Synthetic credentials only, kept internal. Assertions never print QR/token payloads.
const tokenUntil = (milliseconds) => ['e30', Buffer.from(JSON.stringify({ v: 2, exp: milliseconds / 1000 })).toString('base64url'), 'synthetic'].join('.')
const exam = (token, status = 'AVAILABLE') => ({ exam_id: 1, subject: 'Materia', exam_title: 'Examen',
  scheduled_at: '2027-01-01 10:00:00', qr_status: status, is_qr_available: status === 'AVAILABLE',
  qr_code_base64: 'data:image/svg+xml;base64,', token })

function harness() {
  let listCalls = 0
  let qrCalls = 0
  let listHandler
  let qrHandler
  const signals = []
  const h = sourceHarness({ '@/features/students/api/studentQrApi': {
    getStudentExams: (signal) => { listCalls++; signals.push(signal); return listHandler(signal) },
    getStudentExamQr: (id, signal) => { qrCalls++; signals.push(signal); return qrHandler(id, signal) },
  }, '@/features/students/api/studentQrError': {
    getStudentQrError: (cause) => ({ status: cause.status, message: 'Solicitud rechazada' }),
  } })
  const { useStudentExams } = h.load('features/students/hooks/useStudentExams.ts')
  const { useStudentQr } = h.load('features/students/hooks/useStudentQr.ts')
  const fresh = h.load('features/students/utils/studentQrFreshness.ts')
  let data = [exam(tokenUntil(h.now() + 120_000))]
  listHandler = async () => ({ data })
  qrHandler = async () => ({ data: data[0] })
  return { ...h, fresh, useStudentExams, useStudentQr,
    listCalls: () => listCalls, qrCalls: () => qrCalls, signals,
    setData: (value) => { data = value },
    setListHandler: (value) => { listHandler = value },
    setQrHandler: (value) => { qrHandler = value },
    data: () => data,
  }
}

test('033: visible pages refresh at most once per minute without hiding a valid QR on each refresh', async () => {
  const h = harness()
  const render = () => { const list = h.useStudentExams(); return { list, qr: h.useStudentQr(list.data) } }
  h.render(render); await settle()
  let state = h.render()
  state.qr.select(state.list.data[0]); await settle()
  state = h.render()
  assert.ok(state.qr.data !== null)
  assert.equal(h.qrCalls(), 1)
  h.advance(59_999); await settle(); h.render()
  assert.equal(h.listCalls(), 1)
  h.advance(1); await settle(); state = h.render()
  assert.equal(h.listCalls(), 2)
  assert.equal(state.list.loading, false)
  assert.ok(state.qr.data !== null)
  h.unmount()
})

test('033: background tabs pause; returning visible coalesces focus/visibility and fetches authoritative status', async () => {
  const h = harness()
  h.render(h.useStudentExams); await settle(); h.render()
  h.document.visibilityState = 'hidden'; h.emit('visibilitychange', 'document')
  h.advance(120_000); await settle()
  assert.equal(h.listCalls(), 1)
  h.setData([exam(null, 'FINISHED')])
  h.document.visibilityState = 'visible'; h.emit('visibilitychange', 'document'); h.emit('focus')
  await settle()
  const state = h.render()
  assert.equal(h.listCalls(), 2)
  assert.equal(state.data[0].qr_status, 'FINISHED')
  h.unmount(); assert.equal(h.listenerCount(), 0); assert.equal(h.timers.size, 0)
})

test('033: opening a hidden page waits for visibility without initial network activity', async () => {
  const h = harness()
  h.document.visibilityState = 'hidden'
  h.render(h.useStudentExams)
  assert.equal(h.listCalls(), 0)
  h.document.visibilityState = 'visible'; h.emit('visibilitychange', 'document')
  await settle(); const state = h.render()
  assert.equal(h.listCalls(), 1); assert.equal(state.loading, false)
  h.unmount()
})

test('033: a temporal boundary requests a new server decision; client never enables an exam itself', async () => {
  const h = harness()
  const scheduled = new Date(h.now() + 24 * 60 * 60 * 1000 + 10_000).toISOString().slice(0, 19)
  // API timestamps are in La Paz, explicitly offset in the implementation.
  const localScheduled = new Date(Date.parse(scheduled + 'Z') - 4 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  h.setData([{ ...exam(null, 'UPCOMING'), scheduled_at: localScheduled }])
  h.render(h.useStudentExams); await settle(); h.render()
  h.advance(9_999); await settle()
  assert.equal(h.listCalls(), 1)
  h.advance(1); await settle(); const state = h.render()
  assert.equal(h.listCalls(), 2)
  assert.equal(state.data[0].qr_status, 'UPCOMING')
  h.unmount()
})

test('033: repeated events never start concurrent list requests', async () => {
  const h = harness()
  let finish
  h.setListHandler(() => new Promise((resolve) => { finish = resolve }))
  h.render(h.useStudentExams)
  h.advance(120_000); h.emit('focus'); h.emit('visibilitychange', 'document')
  assert.equal(h.listCalls(), 1)
  finish({ data: [] }); await settle(); h.render(); h.unmount()
})

test('033: failed revalidation removes stale data and manual retry recovers', async () => {
  const h = harness()
  h.render(h.useStudentExams); await settle(); h.render()
  h.setListHandler(async () => { throw { status: 403 } })
  h.advance(60_000); await settle(); let state = h.render()
  assert.equal(state.error.status, 403); assert.equal(state.data.length, 0)
  h.setListHandler(async () => ({ data: h.data() }))
  state.retry(); h.render(); await settle(); state = h.render()
  assert.equal(state.error, null); assert.equal(state.data.length, 1)
  h.unmount()
})

test('033: QR selection revalidates with backend instead of reusing inline cached credentials', async () => {
  const h = harness()
  let state = h.render(() => h.useStudentQr(h.data()))
  h.setQrHandler(async () => { throw { status: 403 } })
  state.select(h.data()[0]); await settle(); state = h.render()
  assert.equal(h.qrCalls(), 1); assert.ok(state.data === null); assert.equal(state.error.status, 403)
  h.unmount()
})

test('033: an open QR is removed at expiry without changing JWT duration or authorizing locally', async () => {
  const h = harness()
  h.setData([exam(tokenUntil(h.now() + 10_000))])
  let state = h.render(() => h.useStudentQr(h.data()))
  state.select(h.data()[0]); await settle(); state = h.render()
  assert.ok(state.data !== null)
  h.advance(10_000); state = h.render()
  assert.ok(state.data === null); assert.equal(state.error.status, 404)
  assert.equal(h.qrCalls(), 1)
  h.unmount()
})

test('033: authoritative revocation, missing exams and token rotation suppress an open QR', async () => {
  const h = harness()
  const original = h.data()[0]
  let state = h.render(() => h.useStudentQr(h.data()))
  state.select(original); await settle(); state = h.render()
  assert.ok(state.data !== null)
  h.setData([exam(null, 'NOT_ELIGIBLE')]); state = h.render()
  assert.ok(state.data === null); assert.equal(state.examId, null)
  h.setData([]); state = h.render(); assert.ok(state.data === null)
  h.setData([exam(tokenUntil(h.now() + 180_000))]); state = h.render()
  assert.ok(state.data === null)
  h.unmount()
})

test('033: malformed, missing-exp and expired server QR responses are never displayed', async () => {
  const h = harness()
  for (const invalid of ['malformed', 'e30.e30.synthetic', tokenUntil(h.now() - 1_000)]) {
    h.setData([exam(invalid)])
    let state = h.render(() => h.useStudentQr(h.data()))
    state.select(h.data()[0]); await settle(); state = h.render()
    assert.ok(state.data === null, 'Invalid QR must be hidden')
    assert.ok(state.error !== null)
  }
  h.unmount()
})

test('033: late QR responses cannot replace the selection or update unmounted state', async () => {
  const h = harness()
  let finish
  h.setQrHandler(() => new Promise((resolve) => { finish = resolve }))
  let state = h.render(() => h.useStudentQr(h.data()))
  state.select(h.data()[0]); state = h.render(); state.clear(); h.render()
  finish({ data: h.data()[0] }); await settle(); state = h.render()
  assert.equal(state.examId, null); assert.ok(state.data === null)
  state.select(h.data()[0]); h.render(); h.unmount()
  assert.ok(h.signals.at(-1).aborted)
})

test('033: unmount aborts list requests, timers and event listeners', async () => {
  const h = harness()
  h.render(h.useStudentExams); await settle(); h.render()
  h.unmount()
  assert.ok(h.signals[0].aborted)
  assert.equal(h.timers.size, 0); assert.equal(h.listenerCount(), 0)
})

test('033: returning from a suspended tab invalidates expired QR even if timers never ran', async () => {
  const h = harness()
  h.setData([exam(tokenUntil(h.now() + 10_000))])
  let state = h.render(() => h.useStudentQr(h.data()))
  state.select(h.data()[0]); await settle(); state = h.render()
  assert.ok(state.data !== null)
  h.jump(20_000)
  h.emit('focus'); state = h.render()
  assert.ok(state.data === null)
  assert.equal(h.qrCalls(), 1)
  h.unmount()
})

test('033: unavailable exams never request QR and responses for another exam are rejected', async () => {
  const h = harness()
  let state = h.render(() => h.useStudentQr(h.data()))
  state.select(exam(null, 'NOT_ELIGIBLE'))
  assert.equal(h.qrCalls(), 0)
  h.setQrHandler(async () => ({ data: { ...h.data()[0], exam_id: 2 } }))
  state.select(h.data()[0]); await settle(); state = h.render()
  assert.ok(state.data === null)
  assert.ok(state.error !== null)
  h.unmount()
})
