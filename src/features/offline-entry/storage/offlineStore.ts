import type {
  LocalEntry,
  OfflinePackage,
  StoredPackage,
  SyncResult,
} from '../types/offline.types'
import { parseOfflinePackage } from '../utils/offlineContract'
import {
  capturePayload,
  packageBlocker,
  studentBlocker,
} from '../utils/offlineRules'
import { offlineTransaction } from './offlineDatabase'

const key = (ownerId: number, id: string) => `${ownerId}:${id}`
const query = (ownerId: number, examId: number) =>
  IDBKeyRange.only([ownerId, examId])
export function readOwnedOfflinePackages(ownerId: number) {
  return offlineTransaction<StoredPackage[]>(
    ownerId,
    0,
    ['packages'],
    'readonly',
    (tx, done, fail) => {
      const request = tx
        .objectStore('packages')
        .index('owner')
        .getAll(IDBKeyRange.only(ownerId))
      request.onsuccess = () => {
        try {
          done(
            (request.result as StoredPackage[])
              .map((stored) => ({
                ...stored,
                packet: parseOfflinePackage(
                  stored.packet,
                  stored.examId,
                  ownerId,
                ),
              }))
              .sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
          )
        } catch (error) {
          fail(error)
        }
      }
    },
  )
}
export function readOfflineData(ownerId: number, examId: number) {
  return offlineTransaction<{
    packages: StoredPackage[]
    entries: LocalEntry[]
  }>(ownerId, examId, ['packages', 'events'], 'readonly', (tx, done, fail) => {
    const packages = tx
      .objectStore('packages')
      .index('ownerExam')
      .getAll(query(ownerId, examId))
    const events = tx
      .objectStore('events')
      .index('ownerExam')
      .getAll(query(ownerId, examId))
    const result = {
      packages: [] as StoredPackage[],
      entries: [] as LocalEntry[],
    }
    packages.onsuccess = () => {
      try {
        result.packages = (packages.result as StoredPackage[])
          .map((stored) => ({
            ...stored,
            packet: parseOfflinePackage(stored.packet, examId, ownerId),
          }))
          .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
        done(result)
      } catch (error) {
        fail(error)
      }
    }
    events.onsuccess = () => {
      result.entries = (events.result as LocalEntry[]).sort((a, b) =>
        a.payload.captured_at.localeCompare(b.payload.captured_at),
      )
      done(result)
    }
  })
}

export function saveOfflinePackage(ownerId: number, packet: OfflinePackage) {
  const clean = parseOfflinePackage(packet, packet.exam_id, ownerId)
  return offlineTransaction<StoredPackage>(
    ownerId,
    packet.exam_id,
    ['packages'],
    'readwrite',
    (tx, done) => {
      const stored: StoredPackage = {
        key: key(ownerId, clean.package_id),
        ownerId,
        examId: clean.exam_id,
        savedAt: new Date().toISOString(),
        staleReason: null,
        packet: clean,
      }
      tx.objectStore('packages').put(stored)
      done(stored)
    },
  )
}

export function captureOfflineEntry(
  ownerId: number,
  packet: OfflinePackage,
  studentId: number,
  method: 'MANUAL' | 'QR',
  qrToken?: string,
) {
  return offlineTransaction<LocalEntry>(
    ownerId,
    packet.exam_id,
    ['packages', 'events'],
    'readwrite',
    (tx, done, fail) => {
      const request = tx
        .objectStore('packages')
        .get(key(ownerId, packet.package_id))
      request.onsuccess = () => {
        try {
          const stored = request.result as StoredPackage | undefined
          if (!stored)
            throw new Error('No hay un paquete persistido para esta captura.')
          const blocker = packageBlocker(stored)
          if (blocker) throw new Error(blocker)
          const student = stored.packet.students.find(
            (row) => row.student_id === studentId,
          )
          if (!student)
            throw new Error('El estudiante no pertenece a esta lista.')
          const denied = studentBlocker(student, [])
          if (denied) throw new Error(denied)
          const payload = capturePayload(
            stored.packet,
            studentId,
            method,
            qrToken,
          )
          const entry: LocalEntry = {
            key: key(ownerId, payload.event_id),
            ownerId,
            examId: packet.exam_id,
            packageId: packet.package_id,
            listId: packet.list_id,
            version: packet.version,
            roomId: packet.room_id,
            payload,
            status: 'PENDING',
            result: null,
          }
          // The unique student index arbitrates even when two tabs confirm concurrently.
          tx.objectStore('events').add(entry)
          done(entry)
        } catch (error) {
          fail(error)
        }
      }
    },
  )
}

const staleCodes = new Set([
  'AUTHORIZATION_CHANGED',
  'LIST_VERSION_MISMATCH',
  'EXAM_CHANGED',
  'STUDENT_DATA_CHANGED',
  'EXAM_CANCELLED',
  'EXAM_FINISHED',
  'EXAM_ENDED',
  'EXAM_STATE_NOT_ALLOWED',
  'EXAM_NOT_STARTED',
  'ROOM_MISMATCH',
])
export function saveSyncResults(
  ownerId: number,
  examId: number,
  results: SyncResult[],
) {
  return offlineTransaction<void>(
    ownerId,
    examId,
    ['events', 'packages'],
    'readwrite',
    (tx, _done, fail) => {
      for (const result of results) {
        const request = tx
          .objectStore('events')
          .get(key(ownerId, result.event_id))
        request.onsuccess = () => {
          const entry = request.result as LocalEntry | undefined
          if (!entry || entry.examId !== examId) {
            fail(new Error('El resultado no corresponde a un evento local.'))
            return
          }
          if (entry.status !== 'PENDING') return
          tx.objectStore('events').put({
            ...entry,
            status: result.status,
            result,
          })
          if (staleCodes.has(result.code)) {
            const packetRequest = tx
              .objectStore('packages')
              .get(key(ownerId, entry.packageId))
            packetRequest.onsuccess = () => {
              const stored = packetRequest.result as StoredPackage | undefined
              if (stored)
                tx.objectStore('packages').put({
                  ...stored,
                  staleReason: result.message,
                })
            }
          }
        }
      }
    },
  )
}

export function markOfflinePackagesStale(
  ownerId: number,
  examId: number,
  reason: string,
) {
  return offlineTransaction<void>(
    ownerId,
    examId,
    ['packages'],
    'readwrite',
    (tx) => {
      const store = tx.objectStore('packages')
      const request = store.index('ownerExam').getAll(query(ownerId, examId))
      request.onsuccess = () =>
        (request.result as StoredPackage[]).forEach((packet) =>
          store.put({ ...packet, staleReason: reason }),
        )
    },
  )
}

export function deleteOfflineExam(
  ownerId: number,
  examId: number,
  acknowledgeUnresolved: boolean,
) {
  return offlineTransaction<void>(
    ownerId,
    examId,
    ['packages', 'events', 'locks'],
    'readwrite',
    (tx, _done, fail) => {
      const locked = tx.objectStore('locks').get(`${ownerId}:${examId}`)
      locked.onsuccess = () => {
        if (
          locked.result &&
          (locked.result as { expiresAt: number }).expiresAt > Date.now()
        ) {
          fail(
            new Error(
              'Hay una sincronización en curso. Espera a que termine antes de eliminar datos.',
            ),
          )
          return
        }
        const events = tx
          .objectStore('events')
          .index('ownerExam')
          .getAll(query(ownerId, examId))
        events.onsuccess = () => {
          const entries = events.result as LocalEntry[]
          if (
            !acknowledgeUnresolved &&
            entries.some(
              (entry) => !['ACCEPTED', 'DUPLICATE'].includes(entry.status),
            )
          ) {
            fail(
              new Error(
                'Hay eventos pendientes, conflictivos o rechazados. Debes reconocer expresamente su pérdida.',
              ),
            )
            return
          }
          entries.forEach((entry) => tx.objectStore('events').delete(entry.key))
          const packets = tx
            .objectStore('packages')
            .index('ownerExam')
            .getAll(query(ownerId, examId))
          packets.onsuccess = () =>
            (packets.result as StoredPackage[]).forEach((packet) =>
              tx.objectStore('packages').delete(packet.key),
            )
        }
      }
    },
  )
}

export function acquireSyncLease(
  ownerId: number,
  examId: number,
  token: string,
) {
  return offlineTransaction<void>(
    ownerId,
    examId,
    ['locks'],
    'readwrite',
    (tx, _done, fail) => {
      const store = tx.objectStore('locks')
      const request = store.get(`${ownerId}:${examId}`)
      request.onsuccess = () => {
        const lease = request.result as
          { token: string; expiresAt: number } | undefined
        if (lease && lease.token !== token && lease.expiresAt > Date.now()) {
          fail(
            new Error(
              'Este examen ya se está sincronizando desde otra pestaña.',
            ),
          )
          return
        }
        store.put({
          key: `${ownerId}:${examId}`,
          token,
          expiresAt: Date.now() + 90000,
        })
      }
    },
  )
}
export function releaseSyncLease(
  ownerId: number,
  examId: number,
  token: string,
) {
  return offlineTransaction<void>(
    ownerId,
    examId,
    ['locks'],
    'readwrite',
    (tx) => {
      const store = tx.objectStore('locks')
      const request = store.get(`${ownerId}:${examId}`)
      request.onsuccess = () => {
        if ((request.result as { token?: string } | undefined)?.token === token)
          store.delete(`${ownerId}:${examId}`)
      }
    },
  )
}
