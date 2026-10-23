import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, settle } from '../../../shared/tests/sourceHarness.mjs'

const serverTime = Date.parse('2026-10-23T14:00:00Z')
const stamp = (offset) => new Date(serverTime + offset).toISOString()
const before = {
  id: 17, room: { id: 7 }, entry_available: false, entry_unavailable_reason: 'EXAM_NOT_STARTED',
  server_time: stamp(0), entry_opens_at: stamp(1_000), entry_closes_at: stamp(10_000),
}
const open = { ...before, entry_available: true, entry_unavailable_reason: null, server_time: stamp(1_000) }
const ended = { ...before, entry_unavailable_reason: 'EXAM_ENDED', server_time: stamp(10_000) }
const response = (exam) => ({ exam, data: [], meta: {}, summary: {} })

function harness(initial = before) {
  const calls = []
  let nextResponse = response(initial)
  let handler = async () => nextResponse
  const h = sourceHarness({ '../api/entryControlApi': {
    getEntryControlStudents: (...args) => { calls.push(args); return handler(...args) },
    getEntryControlErrorMessage: () => 'Error de consulta',
  } })
  const { useEntryControlStudents } = h.load('features/exams/hooks/useEntryControlStudents.ts')
  let examId = 17
  let state
  const render = () => (state = h.render(() => useEntryControlStudents(examId)))
  async function flush() {
    h.advance(0); await settle(); render()
  }
  return { ...h, calls, render, flush, state: () => state,
    setExamId: (value) => { examId = value },
    setResponse: (exam) => { nextResponse = response(exam) },
    setHandler: (value) => { handler = value },
    async load() {
      render(); await flush(); await flush()
      assert.equal(state.response.exam.entry_available, initial.entry_available)
      assert.equal(calls.length, 2, 'Existing first GET discovers the assigned room; second GET uses it')
      return state
    },
  }
}

test('opening uses boundary minus server_time despite a different local clock; only a server reply enables entry', async () => {
  const h = harness()
  await h.load()
  assert.notEqual(h.now(), serverTime)
  assert.equal(h.timers.size, 1)
  let reply
  h.setHandler(() => new Promise((resolve) => { reply = resolve }))
  h.advance(1_249); assert.equal(h.calls.length, 2)
  h.advance(1); h.render()
  assert.equal(h.calls.length, 3)
  assert.equal(h.state().response.exam.entry_available, false, 'Timer alone cannot grant entry')
  assert.equal(h.state().response.exam.entry_unavailable_reason, 'EXAM_NOT_STARTED')
  reply(response(open)); await settle(); h.render()
  assert.equal(h.state().response.exam.entry_available, true)
  assert.equal(h.timers.size, 1, 'The returned context replaces opening with a single closing timer')
  assert.equal(h.calls.at(-1)[1].room_id, 7)
  h.unmount(); assert.equal(h.timers.size, 0); assert.equal(h.listenerCount(), 0)
})

test('closing revalidates the open exam and preserves availability until backend returns EXAM_ENDED', async () => {
  const h = harness(open)
  await h.load()
  let reply
  h.setHandler(() => new Promise((resolve) => { reply = resolve }))
  h.advance(9_249); assert.equal(h.calls.length, 2)
  h.advance(1); h.render()
  assert.equal(h.calls.length, 3)
  assert.equal(h.state().response.exam.entry_available, true)
  reply(response(ended)); await settle(); h.render()
  assert.equal(h.state().response.exam.entry_available, false)
  assert.equal(h.state().response.exam.entry_unavailable_reason, 'EXAM_ENDED')
  assert.equal(h.timers.size, 0)
  h.unmount()
})

test('a boundary response that still says unavailable never grants entry or starts concurrent requests', async () => {
  const h = harness()
  await h.load()
  h.advance(1_250); await settle(); h.render()
  assert.equal(h.calls.length, 3)
  assert.equal(h.state().response.exam.entry_available, false)
  h.unmount()
})

for (const event of ['focus', 'visibilitychange']) {
  test(event + ' refreshes authoritative context and coalesces the accompanying event', async () => {
    const h = harness()
    await h.load()
    h.setResponse(open)
    if (event === 'visibilitychange') {
      h.document.visibilityState = 'hidden'; h.emit(event, 'document')
      h.advance(200); assert.equal(h.calls.length, 2)
      h.document.visibilityState = 'visible'
    }
    h.emit(event, event === 'focus' ? 'window' : 'document')
    h.advance(100)
    h.emit(event === 'focus' ? 'visibilitychange' : 'focus', event === 'focus' ? 'document' : 'window')
    h.advance(199); assert.equal(h.calls.length, 2)
    h.advance(1); await settle(); h.render()
    assert.equal(h.calls.length, 3)
    assert.equal(h.state().response.exam.entry_available, true)
    assert.equal(h.timers.size, 1)
    h.unmount(); assert.equal(h.listenerCount(), 0); assert.equal(h.timers.size, 0)
  })
}

test('focus/visibility while a request is pending do not start a duplicate GET', async () => {
  const h = harness()
  await h.load()
  let reply
  h.setHandler(() => new Promise((resolve) => { reply = resolve }))
  h.emit('focus'); h.advance(200)
  h.emit('focus'); h.emit('visibilitychange', 'document'); h.advance(500)
  assert.equal(h.calls.length, 3)
  reply(response(open)); await settle(); h.render()
  h.unmount()
})

test('new server context replaces the previous timer without resetting filters or pagination', async () => {
  const h = harness()
  await h.load()
  h.state().setQuery('Ana'); h.render(); h.advance(300); await settle(); h.render()
  h.state().setPage(2); h.render(); await h.flush()
  h.setResponse({ ...before, entry_opens_at: stamp(20_000) })
  h.emit('focus'); h.advance(200); await settle(); h.render()
  const calls = h.calls.length
  h.advance(1_250); await settle(); h.render()
  assert.equal(h.calls.length, calls, 'Old opening timer was cleared')
  assert.equal(h.state().query, 'Ana')
  assert.deepEqual(h.calls.at(-1)[1], { search: 'Ana', page: 2, per_page: 10, room_id: 7 })
  assert.equal(h.timers.size, 1)
  h.unmount()
})

test('unmount clears boundary and resume timers and removes listeners', async () => {
  const h = harness()
  await h.load()
  h.emit('focus')
  assert.equal(h.timers.size, 2)
  h.unmount()
  assert.equal(h.timers.size, 0); assert.equal(h.listenerCount(), 0)
  assert.ok(h.calls.at(-1)[2].aborted)
  h.advance(100_000); h.emit('focus'); h.emit('visibilitychange', 'document')
  assert.equal(h.calls.length, 2)
})

test('unmount aborts an in-flight request and its late reply cannot install a new timer', async () => {
  const h = harness()
  await h.load()
  let reply
  h.setHandler(() => new Promise((resolve) => { reply = resolve }))
  h.emit('focus'); h.advance(200)
  const signal = h.calls.at(-1)[2]
  h.unmount()
  assert.ok(signal.aborted)
  reply(response(open)); await settle()
  assert.equal(h.timers.size, 0)
  assert.equal(h.listenerCount(), 0)
})

test('a focus refresh during search debounce consumes the initial timer instead of duplicating the GET', async () => {
  const h = harness()
  await h.load()
  h.state().setQuery('Ana'); h.render()
  h.emit('focus'); h.advance(200); await settle(); h.render()
  assert.equal(h.calls.length, 3)
  h.advance(100); await settle(); h.render()
  assert.equal(h.calls.length, 3)
  h.unmount()
})

test('changing exam cancels the previous request and ignores its late response', async () => {
  const h = harness()
  await h.load()
  let reply
  h.setHandler(() => new Promise((resolve) => { reply = resolve }))
  h.emit('focus'); h.advance(200)
  const oldSignal = h.calls.at(-1)[2]
  h.setExamId(18); h.render()
  assert.ok(oldSignal.aborted)
  h.setResponse({ ...open, id: 18 })
  h.setHandler(async () => response({ ...open, id: 18 }))
  await h.flush()
  reply(response(ended)); await settle(); h.render()
  assert.equal(h.state().response.exam.id, 18)
  assert.equal(h.state().response.exam.entry_available, true)
  h.unmount()
})

test('invalid timestamps and terminal reasons do not create polling loops; focus still works', async () => {
  for (const exam of [ended, { ...before, server_time: 'invalid' }, { ...before, entry_opens_at: null }]) {
    const h = harness(exam)
    await h.load()
    assert.equal(h.timers.size, 0)
    h.advance(60_000); assert.equal(h.calls.length, 2)
    h.emit('focus'); h.advance(200); await settle(); h.render()
    assert.equal(h.calls.length, 3)
    h.unmount()
  }
})
