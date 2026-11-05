import { sendOfflineBatch } from '../api/offlineApi'
import {
  acquireSyncLease,
  readOfflineData,
  releaseSyncLease,
  saveSyncResults,
} from '../storage/offlineStore'
import type { LocalEntry, SyncBatch, SyncResult } from '../types/offline.types'
import { assertOfflineOwner } from './offlineIdentity'

export function buildSyncBatches(entries: LocalEntry[]): SyncBatch[] {
  const groups = new Map<string, LocalEntry[]>()
  for (const entry of entries) {
    if (entry.status !== 'PENDING') continue
    const key = JSON.stringify([
      entry.packageId,
      entry.listId,
      entry.version,
      entry.roomId,
    ])
    const group = groups.get(key) ?? []
    group.push(entry)
    groups.set(key, group)
  }
  return [...groups.values()].flatMap((group) => {
    const batches: SyncBatch[] = []
    for (let offset = 0; offset < group.length; offset += 100) {
      const first = group[offset]
      batches.push({
        package_id: first.packageId,
        list_id: first.listId,
        version: first.version,
        room_id: first.roomId,
        events: group.slice(offset, offset + 100).map((entry) => entry.payload),
      })
    }
    return batches
  })
}

const running = new Set<string>()
export async function synchronizeOfflineEntries(
  ownerId: number,
  examId: number,
  signal: AbortSignal,
  onProgress: (processed: number) => void,
  send = sendOfflineBatch,
): Promise<SyncResult[]> {
  const name = `eida-offline-sync:${ownerId}:${examId}`
  if (running.has(name))
    throw new Error('Ya hay una sincronización en curso para este examen.')
  const identity = assertOfflineOwner(ownerId)
  const token = crypto.randomUUID()
  running.add(name)
  const run = async () => {
    await acquireSyncLease(ownerId, examId, token)
    try {
      const { entries } = await readOfflineData(ownerId, examId)
      const results: SyncResult[] = []
      for (const batch of buildSyncBatches(entries)) {
        signal.throwIfAborted()
        assertOfflineOwner(ownerId, identity.contextId)
        await acquireSyncLease(ownerId, examId, token)
        const received = await send(examId, batch, signal)
        signal.throwIfAborted()
        assertOfflineOwner(ownerId, identity.contextId)
        await saveSyncResults(ownerId, examId, received)
        results.push(...received)
        onProgress(results.length)
      }
      return results
    } finally {
      await releaseSyncLease(ownerId, examId, token).catch(() => {
        /* An invalidated identity leaves only an expiring lease. */
      })
    }
  }
  try {
    if (navigator.locks)
      return await navigator.locks.request(
        name,
        { ifAvailable: true },
        async (lock) => {
          if (!lock)
            throw new Error('Otra pestaña está sincronizando este examen.')
          return run()
        },
      )
    return await run()
  } finally {
    running.delete(name)
  }
}
