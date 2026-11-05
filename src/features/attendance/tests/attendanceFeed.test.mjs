import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, settle } from '../../../shared/tests/sourceHarness.mjs'
import { page } from './attendanceFixtures.mjs'
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { onLine: true },
})
test('HU32 polls without overlapping requests, clears unconfirmed data on error and retries after backoff', async () => {
  const h = sourceHarness(),
    { useAttendanceFeed } = h.load(
      'features/attendance/hooks/useAttendanceFeed.ts',
    )
  let calls = 0,
    finish
  const load = () => {
    calls++
    return new Promise((resolve) => {
      finish = resolve
    })
  }
  h.render(() => useAttendanceFeed('4', load))
  let state = h.render()
  assert.equal(state.refreshing, true)
  h.advance(10000)
  assert.equal(calls, 1)
  finish(page)
  await settle()
  state = h.render()
  assert.equal(state.data.summary.registered, 1)
  h.advance(5000)
  assert.equal(calls, 2)
  assert.equal(h.render().refreshing, true)
  h.unmount()
  assert.equal(h.timers.size, 0)
  assert.equal(h.listenerCount(), 0)
})
test('HU32 an error removes previous counters and old timestamp; forbidden stops automatic retries', async () => {
  const h = sourceHarness(),
    { useAttendanceFeed } = h.load(
      'features/attendance/hooks/useAttendanceFeed.ts',
    )
  let calls = 0
  const load = async () => {
    calls++
    if (calls === 1) return page
    throw Object.assign(new Error('Acceso denegado'), { status: 403 })
  }
  h.render(() => useAttendanceFeed('4', load))
  await settle()
  assert.ok(h.render().data)
  h.advance(5000)
  await settle()
  const state = h.render()
  assert.equal(state.data, null)
  assert.equal(state.error, 'Acceso denegado')
  h.advance(60000)
  assert.equal(calls, 2)
  h.unmount()
})
test('HU32 scope change aborts old exam and never shows its late result', async () => {
  const h = sourceHarness(),
    { useAttendanceFeed } = h.load(
      'features/attendance/hooks/useAttendanceFeed.ts',
    )
  let scope = '4',
    complete
  const signals = []
  const load = (signal) => {
    signals.push(signal)
    return scope === '4'
      ? new Promise((resolve) => {
          complete = resolve
        })
      : Promise.resolve({ ...page, exam: { ...page.exam, id: 5 } })
  }
  h.render(() => useAttendanceFeed(scope, load))
  scope = '5'
  h.render()
  assert.equal(signals[0].aborted, true)
  complete(page)
  await settle()
  assert.equal(h.render().data.exam.id, 5)
  h.unmount()
})
test('HU32 hides current data while hidden or offline and refreshes on return', async () => {
  const h = sourceHarness(),
    { useAttendanceFeed } = h.load(
      'features/attendance/hooks/useAttendanceFeed.ts',
    )
  let calls = 0
  const load = async () => {
    calls++
    return page
  }
  h.render(() => useAttendanceFeed('4', load))
  await settle()
  h.document.visibilityState = 'hidden'
  h.emit('visibilitychange', 'document')
  let state = h.render()
  assert.equal(state.paused, true)
  assert.equal(state.data, null)
  h.advance(30000)
  assert.equal(calls, 1)
  h.document.visibilityState = 'visible'
  h.emit('visibilitychange', 'document')
  await settle()
  assert.ok(h.render().data)
  navigator.onLine = false
  h.emit('offline')
  assert.equal(h.render().paused, true)
  navigator.onLine = true
  h.emit('online')
  await settle()
  assert.ok(h.render().data)
  assert.equal(calls, 3)
  h.unmount()
})
