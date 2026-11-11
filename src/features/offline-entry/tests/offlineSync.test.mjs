import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'
import { localEntry } from './offlineFixtures.mjs'

globalThis.crypto ??= webcrypto
Object.defineProperty(globalThis, 'navigator', {
  value: {},
  configurable: true,
})
function setup(entries) {
  const committed = []
  const calls = []
  let leases = 0
  const storage = {
    readOfflineData: async () => ({ entries }),
    acquireSyncLease: async () => {
      leases++
    },
    releaseSyncLease: async () => {
      leases--
    },
    saveSyncResults: async (_owner, _exam, results) => {
      committed.push(...results)
      for (const result of results)
        entries.find(
          (entry) => entry.payload.event_id === result.event_id,
        ).status = result.status
    },
  }
  const harness = sourceHarness({
    '../api/offlineApi': {
      sendOfflineBatch: async (_exam, batch) => {
        calls.push(structuredClone(batch))
        return batch.events.map((event) => ({
          event_id: event.event_id,
          status: 'ACCEPTED',
          entry_id: 501,
          code: 'ENTRY_REGISTERED',
          message: 'Ingreso registrado.',
        }))
      },
    },
    '../storage/offlineStore': storage,
    './offlineIdentity': { assertOfflineOwner: () => ({ contextId: 'test' }) },
  })
  return {
    ...harness.load('features/offline-entry/services/offlineSync.ts'),
    calls,
    committed,
    storage,
    leases: () => leases,
  }
}
test('HU37: batches are at most 100, retain original payloads and separate original packages', () => {
  const service = setup([])
  const entries = Array.from({ length: 205 }, (_, i) => localEntry(i))
  entries.push(localEntry(500, { packageId: 'another-package' }))
  entries.push(localEntry(600, { status: 'CONFLICT' }))
  const batches = service.buildSyncBatches(entries)
  assert.deepEqual(
    batches.map((batch) => batch.events.length),
    [100, 100, 5, 1],
  )
  assert.equal(batches[0].events[0], entries[0].payload)
  assert.equal(batches[3].package_id, 'another-package')
})
test('HU37: synchronizes sequentially and persists every batch before the next', async () => {
  const service = setup(Array.from({ length: 201 }, (_, i) => localEntry(i)))
  const progress = []
  const results = await service.synchronizeOfflineEntries(
    7,
    42,
    new AbortController().signal,
    (count) => progress.push(count),
  )
  assert.equal(results.length, 201)
  assert.deepEqual(progress, [100, 200, 201])
  assert.equal(service.committed.length, 201)
  assert.equal(service.calls.length, 3)
})
test('HU37: a dropped response leaves events pending and retry preserves UUID and payload', async () => {
  const entries = [localEntry()]
  const original = structuredClone(entries[0].payload)
  const service = setup(entries)
  await assert.rejects(
    service.synchronizeOfflineEntries(
      7,
      42,
      new AbortController().signal,
      () => {},
      async () => {
        throw new Error('network interrupted')
      },
    ),
    /interrupted/,
  )
  assert.equal(entries[0].status, 'PENDING')
  assert.equal(service.committed.length, 0)
  await service.synchronizeOfflineEntries(
    7,
    42,
    new AbortController().signal,
    () => {},
  )
  assert.deepEqual(service.calls[0].events[0], original)
})
test('HU37: keeps earlier batch results and unacknowledged later events after interruption', async () => {
  const entries = Array.from({ length: 101 }, (_, i) => localEntry(i))
  const service = setup(entries)
  let sent = 0
  await assert.rejects(
    service.synchronizeOfflineEntries(
      7,
      42,
      new AbortController().signal,
      () => {},
      async (_exam, batch) => {
        if (++sent > 1) throw new Error('offline')
        return batch.events.map((event) => ({
          event_id: event.event_id,
          status: 'DUPLICATE',
          entry_id: 501,
          code: 'ALREADY_REGISTERED',
          message: 'Ya registrado.',
        }))
      },
    ),
    /offline/,
  )
  assert.equal(
    entries.filter((entry) => entry.status === 'DUPLICATE').length,
    100,
  )
  assert.equal(entries[100].status, 'PENDING')
})
test('HU37: simultaneous synchronization within a tab is rejected', async () => {
  const service = setup([localEntry()])
  let release
  const pending = new Promise((resolve) => {
    release = resolve
  })
  let started
  const ready = new Promise((resolve) => {
    started = resolve
  })
  const first = service.synchronizeOfflineEntries(
    7,
    42,
    new AbortController().signal,
    () => {},
    async () => {
      started()
      return pending
    },
  )
  await ready
  await assert.rejects(
    service.synchronizeOfflineEntries(
      7,
      42,
      new AbortController().signal,
      () => {},
    ),
    /en curso/,
  )
  release([
    {
      event_id: localEntry().payload.event_id,
      status: 'CONFLICT',
      code: 'AUTHORIZATION_CHANGED',
      message: 'Revisión.',
      entry_id: null,
    },
  ])
  await first
  assert.equal(service.committed[0].status, 'CONFLICT')
})
test('HU37: Web Locks blocks another tab and terminal conflicts/rejections are not resent', async () => {
  navigator.locks = {
    request: async (_name, _options, callback) => callback(null),
  }
  const service = setup([localEntry()])
  await assert.rejects(
    service.synchronizeOfflineEntries(
      7,
      42,
      new AbortController().signal,
      () => {},
    ),
    /Otra pestaña/,
  )
  assert.equal(service.calls.length, 0)
  delete navigator.locks
  const terminal = setup([
    localEntry(0, { status: 'CONFLICT' }),
    localEntry(1, { status: 'REJECTED' }),
  ])
  assert.deepEqual(
    await terminal.synchronizeOfflineEntries(
      7,
      42,
      new AbortController().signal,
      () => {},
    ),
    [],
  )
  assert.equal(terminal.calls.length, 0)
})
