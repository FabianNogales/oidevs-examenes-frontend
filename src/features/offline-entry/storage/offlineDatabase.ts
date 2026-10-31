import { assertOfflineOwner } from '../services/offlineIdentity'

const DB_NAME = 'eida-offline-entry-v1'
let connection: Promise<IDBDatabase> | null = null
export const DATA_CHANGED = 'eida:offline-data'

function openDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB)
    return Promise.reject(
      new Error(
        'Este navegador no permite IndexedDB. El dispositivo no está preparado para trabajar sin conexión.',
      ),
    )
  if (connection) return connection
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    let failed = false
    request.onupgradeneeded = () => {
      const db = request.result
      for (const name of ['packages', 'events']) {
        const store = db.createObjectStore(name, { keyPath: 'key' })
        store.createIndex('ownerExam', ['ownerId', 'examId'])
        store.createIndex('owner', 'ownerId')
        if (name === 'events')
          store.createIndex(
            'student',
            ['ownerId', 'examId', 'payload.student_id'],
            { unique: true },
          )
      }
      db.createObjectStore('locks', { keyPath: 'key' })
    }
    request.onerror = () => {
      failed = true
      connection = null
      reject(
        new Error(
          'No se pudo abrir el almacenamiento local. Comprueba permisos y espacio disponible.',
        ),
      )
    }
    request.onblocked = () => {
      failed = true
      connection = null
      reject(
        new Error(
          'Otra pestaña bloquea el almacenamiento. Ciérrala y vuelve a intentarlo.',
        ),
      )
    }
    request.onsuccess = () => {
      const db = request.result
      if (failed) {
        db.close()
        return
      }
      db.onversionchange = () => {
        db.close()
        connection = null
      }
      resolve(db)
    }
  })
  return connection
}

function announce(ownerId: number, examId: number) {
  window.dispatchEvent(
    new CustomEvent(DATA_CHANGED, { detail: { ownerId, examId } }),
  )
  if ('BroadcastChannel' in globalThis) {
    const channel = new BroadcastChannel(DATA_CHANGED)
    channel.postMessage({ ownerId, examId })
    channel.close()
  }
}

export async function offlineTransaction<T>(
  ownerId: number,
  examId: number,
  stores: string[],
  mode: IDBTransactionMode,
  work: (
    tx: IDBTransaction,
    done: (value: T) => void,
    fail: (cause: unknown) => void,
  ) => void,
): Promise<T> {
  const identity = assertOfflineOwner(ownerId)
  const db = await openDatabase()
  assertOfflineOwner(ownerId, identity.contextId)
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, mode)
    let value: T
    let problem: unknown
    const fail = (cause: unknown) => {
      problem = cause
      tx.abort()
    }
    tx.onabort = () =>
      reject(
        problem ??
          new Error(
            tx.error?.name === 'ConstraintError'
              ? 'Este estudiante ya tiene un evento guardado en este dispositivo.'
              : 'No se confirmó el guardado local. Comprueba permisos y espacio disponible.',
          ),
      )
    tx.onerror = () => {
      /* onabort is the only failure completion. */
    }
    tx.oncomplete = () => {
      try {
        assertOfflineOwner(ownerId, identity.contextId)
        if (mode === 'readwrite' && !stores.every((name) => name === 'locks'))
          announce(ownerId, examId)
        resolve(value)
      } catch (error) {
        reject(error)
      }
    }
    try {
      work(
        tx,
        (result) => {
          value = result
        },
        fail,
      )
    } catch (error) {
      fail(error)
    }
  })
}

export function subscribeOfflineData(
  ownerId: number,
  examId: number,
  listener: () => void,
) {
  const local = (event: Event) => {
    const detail = (event as CustomEvent<{ ownerId: number; examId: number }>)
      .detail
    if (detail?.ownerId === ownerId && detail.examId === examId) listener()
  }
  const channel =
    'BroadcastChannel' in globalThis ? new BroadcastChannel(DATA_CHANGED) : null
  if (channel)
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const value = event.data
      if (
        value &&
        typeof value === 'object' &&
        'ownerId' in value &&
        'examId' in value &&
        value.ownerId === ownerId &&
        value.examId === examId
      )
        listener()
    }
  window.addEventListener(DATA_CHANGED, local)
  return () => {
    window.removeEventListener(DATA_CHANGED, local)
    channel?.close()
  }
}
