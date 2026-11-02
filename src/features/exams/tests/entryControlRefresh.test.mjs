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
const response = (exam, page = 1) => ({ exam, data: [],
  meta: { current_page: page, per_page: 10, total: 20, last_page: 2 },
  summary: { total_students: 20, registered: 5, pending: 15, not_applicable: 0 },
  filter_counts: { all: 20, registered: 5, pending: 15, incidents: 3 },
})

function harness(initial = before) {
  const calls = []
  let nextResponse = response(initial)
  let pendingOnly = false
  let handler = async (_examId, query) => ({ ...nextResponse,
    meta: { ...nextResponse.meta, current_page: query.page },
  })
  const h = sourceHarness({ '../api/entryControlApi': {
    getEntryControlStudents: (...args) => { calls.push(args); return handler(...args) },
    getEntryControlErrorMessage: () => 'Error de consulta',
  } })
  const { useEntryControlStudents } = h.load('features/exams/hooks/useEntryControlStudents.ts')
  let examId = 17
  let state
  const render = () => (state = h.render(() => useEntryControlStudents(examId, pendingOnly)))
  async function flush() {
    h.advance(0); await settle(); render()
  }
  return { ...h, calls, render, flush, state: () => state,
    setExamId: (value) => { examId = value },
    setPendingOnly: (value) => { pendingOnly = value },
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
  assert.deepEqual(h.calls.at(-1)[1], { search: 'Ana', page: 2, per_page: 10, room_id: 7,
    entry_status: undefined, has_incident: undefined })
  assert.equal(h.timers.size, 1)
  h.unmount()
})

test('HU13 verification filters query their backend groups; Manual always queries pending and keeps it isolated', async () => {
  const h = harness()
  const ana = { student_id: 1, first_names: 'Ana', last_names: 'Registrada', entry_status: 'REGISTERED' }
  const bruno = { student_id: 2, first_names: 'Bruno', last_names: 'Pendiente', entry_status: 'PENDING' }
  let registered = [ana]
  let pending = [bruno]
  await h.load()
  h.setHandler(async (_examId, query) => {
    const data = query.entry_status === 'REGISTERED'
      ? registered
      : query.entry_status === 'PENDING'
        ? pending
        : query.has_incident
          ? [ana]
          : [...registered, ...pending]
    return { ...response(open, query.page), data }
  })
  h.state().reload()
  h.render()
  await h.flush()
  assert.deepEqual(h.state().items, [ana, bruno], 'Todos includes registered and pending students')

  h.state().setFilter('registered')
  h.render()
  assert.deepEqual(h.state().items, [], 'Hide Todos rows as soon as Registrados is selected')
  await h.flush()
  assert.equal(h.calls.at(-1)[1].entry_status, 'REGISTERED')
  assert.deepEqual(h.state().items, [ana], 'Todos → Registrados replaces rows with the server group')

  h.state().setFilter('pending')
  h.render()
  assert.deepEqual(h.state().items, [], 'Hide Registrados rows as soon as Pendientes is selected')
  await h.flush()
  assert.equal(h.calls.at(-1)[1].entry_status, 'PENDING')
  assert.deepEqual(h.state().items, [bruno], 'Registrados → Pendientes replaces rows with the server group')

  h.state().setFilter('incidents')
  h.render()
  await h.flush()
  assert.equal(h.calls.at(-1)[1].has_incident, true)
  assert.deepEqual(h.state().items, [ana])

  h.setPendingOnly(true)
  h.render()
  assert.deepEqual(h.state().items, [], 'Rows from the previous group are hidden while pending loads')
  await h.flush()
  assert.deepEqual(h.calls.at(-1)[1], {
    search: '', page: 1, per_page: 10, room_id: 7,
    entry_status: 'PENDING', has_incident: undefined,
  })
  assert.deepEqual(h.state().items, [bruno], 'Manual receives only the pending server group')

  registered = [...registered, bruno]
  pending = []
  h.state().reload()
  h.render()
  assert.deepEqual(h.state().items, [], 'Hide the prior Pending response while registration refreshes')
  await h.flush()
  assert.deepEqual(h.calls.at(-1)[1], {
    search: '', page: 1, per_page: 10, room_id: 7,
    entry_status: 'PENDING', has_incident: undefined,
  })
  assert.deepEqual(h.state().items, [], 'Reload replaces Manual rows from the backend; no local deletion is used')

  h.setPendingOnly(false)
  h.render()
  await h.flush()
  assert.equal(h.calls.at(-1)[1].has_incident, true, 'Verification restores its selected group')
  assert.deepEqual(h.state().items, [ana])
  h.state().setFilter('all')
  h.render()
  await h.flush()
  assert.deepEqual(h.state().items, [ana, bruno], 'The registered student remains in Verificación → Todos')
  h.state().setFilter('registered')
  h.render()
  await h.flush()
  assert.deepEqual(h.calls.at(-1)[1].entry_status, 'REGISTERED')
  assert.deepEqual(h.state().items, [ana, bruno], 'The registered student appears in Verificación → Registrados')
  h.state().setFilter('pending')
  h.render()
  await h.flush()
  assert.deepEqual(h.calls.at(-1)[1].entry_status, 'PENDING')
  assert.deepEqual(h.state().items, [], 'The registered student is absent from Verificación → Pendientes')
  h.state().setFilter('incidents')
  h.render()
  await h.flush()
  assert.equal(h.calls.at(-1)[1].has_incident, true)
  assert.equal(h.calls.at(-1)[1].entry_status, undefined)
  h.unmount()
})

test('a late response from an aborted group query cannot replace the selected group rows', async () => {
  const h = harness()
  await h.load()
  const ana = { student_id: 1, first_names: 'Ana', last_names: 'Registrada', entry_status: 'REGISTERED' }
  const bruno = { student_id: 2, first_names: 'Bruno', last_names: 'Pendiente', entry_status: 'PENDING' }
  const replies = []
  h.setHandler((_examId, query, signal) => new Promise((resolve) => {
    replies.push({ query, signal, resolve })
  }))

  h.state().setFilter('registered')
  h.render()
  await h.flush()
  assert.equal(replies[0].query.entry_status, 'REGISTERED')

  h.state().setFilter('pending')
  h.render()
  await h.flush()
  assert.equal(replies[0].signal.aborted, true)
  assert.equal(replies[1].query.entry_status, 'PENDING')

  replies[1].resolve({ ...response(open), data: [bruno] })
  await settle()
  h.render()
  assert.deepEqual(h.state().items, [bruno])

  replies[0].resolve({ ...response(open), data: [ana] })
  await settle()
  h.render()
  assert.deepEqual(h.state().items, [bruno], 'The old response cannot overwrite the latest result')
  h.unmount()
})

test('HU13 groups keep server search, reset page, and hide rows from another group while refreshing', async () => {
  const h = harness()
  await h.load()
  h.state().setQuery('  Ana  '); h.render(); h.advance(300); await settle(); h.render()
  for (const [filter, entry_status, has_incident] of [
    ['registered', 'REGISTERED', undefined], ['pending', 'PENDING', undefined],
    ['incidents', undefined, true], ['all', undefined, undefined],
  ]) {
    h.state().setPage(2); h.render(); await h.flush()
    assert.equal(h.calls.at(-1)[1].page, 2)
    const previousCounts = h.state().filterCounts
    const before = h.calls.length
    h.state().setFilter(filter); h.render()
    assert.equal(h.state().loading, true, 'Mark the list as refreshing while the request is pending')
    assert.deepEqual(h.state().items, [], 'Do not show rows returned for another server group')
    assert.equal(h.state().meta, null, 'Do not show pagination from another server group')
    assert.deepEqual(h.state().filterCounts, previousCounts, 'Keep current counts until the backend returns replacements')
    await h.flush()
    assert.equal(h.calls.length, before + 1, 'One server query per group, without downloading all pages')
    assert.deepEqual(h.calls.at(-1)[1], { search: 'Ana', page: 1, per_page: 10, room_id: 7,
      entry_status, has_incident })
    assert.deepEqual(h.state().filterCounts, response(open).filter_counts)
    h.state().setQuery('María'); h.render(); h.advance(300); await settle(); h.render()
    assert.equal(h.calls.at(-1)[1].search, 'María')
    assert.equal(h.calls.at(-1)[1].page, 1)
    assert.equal(h.calls.at(-1)[1].entry_status, entry_status)
    assert.equal(h.calls.at(-1)[1].has_incident, has_incident)
    h.state().setQuery('Ana'); h.render(); h.advance(300); await settle(); h.render()
  }
  h.unmount()
})

test('HU13 uses the effective server page when the requested page no longer exists', async () => {
  const h = harness()
  await h.load()
  h.setHandler(async () => response(before, 1))
  h.state().setPage(2); h.render(); await h.flush(); await h.flush()
  assert.equal(h.calls.at(-2)[1].page, 2)
  assert.equal(h.calls.at(-1)[1].page, 1)
  assert.equal(h.state().meta.current_page, 1)
  h.unmount()
})

test('filter, search, and page refreshes hide rows and metadata until the matching response arrives', async () => {
  const h = harness()
  await h.load()
  const firstStudent = { student_id: 1, first_names: 'Ana', last_names: 'Pendiente', entry_status: 'PENDING' }
  h.setHandler(async (_examId, query) => ({
    ...response(open, query.page),
    data: [firstStudent],
  }))
  h.state().setFilter('pending'); h.render(); await h.flush()
  assert.deepEqual(h.state().items, [firstStudent])

  let refreshIndex = 0
  async function assertRefresh(change, delay, expectedQuery) {
    let reply
    h.setHandler((_examId, query) => {
      assert.deepEqual(query, expectedQuery)
      return new Promise((resolve) => { reply = resolve })
    })
    const previousItems = h.state().items
    const previousCounts = h.state().filterCounts
    change(h.state())
    h.render()
    assert.equal(h.state().loading, true)
    assert.deepEqual(h.state().items, [], 'The previous response belongs to another query')
    assert.equal(h.state().meta, null)
    assert.deepEqual(h.state().filterCounts, previousCounts)
    h.advance(delay); await settle(); h.render()
    reply({
      ...response(open, expectedQuery.page),
      data: [{ ...firstStudent, first_names: `Actualización ${++refreshIndex}` }],
    })
    await settle(); h.render()
    assert.equal(h.state().loading, false)
    assert.notDeepEqual(h.state().items, previousItems)
  }

  await assertRefresh(
    (state) => state.setFilter('registered'),
    0,
    { search: '', page: 1, per_page: 10, room_id: 7, entry_status: 'REGISTERED', has_incident: undefined },
  )
  await assertRefresh(
    (state) => state.setQuery('Ana'),
    300,
    { search: 'Ana', page: 1, per_page: 10, room_id: 7, entry_status: 'REGISTERED', has_incident: undefined },
  )
  await assertRefresh(
    (state) => state.setPage(2),
    0,
    { search: 'Ana', page: 2, per_page: 10, room_id: 7, entry_status: 'REGISTERED', has_incident: undefined },
  )
  h.unmount()
})

test('Verification/Pending and Manual issue independent GETs even with identical HTTP parameters', async () => {
  const h = harness()
  await h.load()
  const fabian = { student_id: 3, first_names: 'Fabian', entry_status: 'PENDING' }
  h.setHandler(async () => ({ ...response(open), data: [fabian] }))
  h.state().setFilter('pending'); h.render(); await h.flush()
  assert.deepEqual(h.state().items, [fabian])
  const before = h.calls.length

  let reply
  h.setHandler(() => new Promise(resolve => { reply = resolve }))
  h.setPendingOnly(true); h.render()
  assert.equal(h.state().loading, true)
  assert.deepEqual(h.state().items, [], 'Manual cannot use Verification/Pending rows')
  await h.flush()
  assert.equal(h.calls.length, before + 1, 'Changing view must request its own response')
  assert.equal(h.calls.at(-1)[1].entry_status, 'PENDING')
  reply({ ...response(open), data: [] }); await settle(); h.render()
  assert.deepEqual(h.state().items, [])
  assert.equal(h.state().loading, false)

  h.setHandler(async () => ({ ...response(open), data: [fabian] }))
  h.setPendingOnly(false); h.render(); await h.flush()
  assert.equal(h.calls.length, before + 2, 'Returning to Verification also requests its own response')
  assert.deepEqual(h.state().items, [fabian])
  h.unmount()
})

test('failed search/page/reload requests cannot relabel previous rows as the active response', async () => {
  for (const change of [state => state.setQuery('Fabian'), state => state.setPage(2), state => state.reload()]) {
    const h = harness()
    await h.load()
    const ana = { student_id: 1, first_names: 'Ana', entry_status: 'REGISTERED' }
    h.setHandler(async () => ({ ...response(open), data: [ana] }))
    h.state().reload(); h.render(); await h.flush()
    assert.deepEqual(h.state().items, [ana])
    h.setHandler(async () => { throw new Error('Network error') })
    change(h.state()); h.render(); h.advance(300); await settle(); h.render()
    assert.equal(h.state().loading, false)
    assert.equal(h.state().error, 'Error de consulta')
    assert.deepEqual(h.state().items, [])
    assert.equal(h.state().meta, null)
    assert.ok(h.state().response.exam, 'Keep the exam context for the error display')
    h.unmount()
  }
})

test('unfiltered backend rows are not silently filtered locally, including in Manual', async () => {
  const h = harness()
  await h.load()
  const data = [
    { student_id: 1, first_names: 'Ana', entry_status: 'REGISTERED' },
    { student_id: 2, first_names: 'Bruno', entry_status: 'REGISTERED' },
    { student_id: 3, first_names: 'Fabian', entry_status: 'PENDING' },
  ]
  h.setHandler(async () => ({ ...response(open), data }))
  for (const filter of ['registered', 'pending']) {
    h.state().setFilter(filter); h.render(); await h.flush()
    assert.equal(h.calls.at(-1)[1].entry_status, filter.toUpperCase())
    assert.equal(h.state().items, data, 'Render the actual backend response')
  }
  h.setPendingOnly(true); h.render(); await h.flush()
  assert.equal(h.calls.at(-1)[1].entry_status, 'PENDING')
  assert.equal(h.state().items, data)
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
