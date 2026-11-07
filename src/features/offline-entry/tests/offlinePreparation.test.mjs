import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceHarness, settle } from '../../../shared/tests/sourceHarness.mjs'
import { packageFixture } from './offlineFixtures.mjs'

Object.defineProperty(globalThis, 'navigator', {
  value: { storage: { persist: async () => false } },
  configurable: true,
})
function setup(save, download = async () => packageFixture()) {
  const notices = []
  let reloads = 0
  let stale = 0
  let saves = 0
  const harness = sourceHarness({
    '@/features/auth/hooks/useAuth': {
      useAuth: () => ({ notify: (...args) => notices.push(args) }),
    },
    '@/features/auth/utils/apiErrors': {
      getApiErrorCode: (error) => error.code ?? null,
      getRequestStatus: (error) => error.status ?? null,
    },
    '../api/offlineApi': {
      downloadOfflinePackage: download,
      offlineError: (error) => error.message ?? 'Error de descarga.',
    },
    '../storage/offlineStore': {
      saveOfflinePackage: async (...args) => {
        saves++
        return save(...args)
      },
      markOfflinePackagesStale: async () => {
        stale++
      },
    },
    '../services/offlineIdentity': {
      assertOfflineOwner: () => ({ contextId: 'verified-account' }),
    },
    '../services/offlinePwa': {
      verifyOfflineShell: async () => ({
        ready: true,
        message: 'Shell confirmado.',
      }),
    },
  })
  const { useOfflinePreparation } = harness.load(
    'features/offline-entry/hooks/useOfflinePreparation.ts',
  )
  const saved = () => {
    reloads++
  }
  return {
    harness,
    render: () => harness.render(() => useOfflinePreparation(7, 42, saved)),
    notices,
    reloads: () => reloads,
    saves: () => saves,
    stale: () => stale,
  }
}
test('HU36: download reports success only after the local transaction commits', async () => {
  let commit
  const transaction = new Promise((resolve) => {
    commit = resolve
  })
  const item = setup(() => transaction)
  const pending = item.render().download()
  await settle()
  assert.equal(item.saves(), 1)
  assert.equal(item.notices.length, 0)
  assert.equal(item.reloads(), 0)
  commit()
  await pending
  assert.equal(item.notices[0][0], 'success')
  assert.equal(item.reloads(), 1)
  assert.equal(item.render().busy, false)
})
test('HU36: failed IndexedDB persistence never claims prepared state', async () => {
  const item = setup(async () => {
    throw new Error('Sin espacio en IndexedDB.')
  })
  await item.render().download()
  assert.equal(item.notices.length, 0)
  assert.equal(item.reloads(), 0)
  assert.match(item.render().error, /IndexedDB/)
})
test('HU36: revoked authorization marks old packages stale and preserves them', async () => {
  const item = setup(
    async () => {},
    async () => {
      throw { status: 403, message: 'Autorización revocada.' }
    },
  )
  await item.render().download()
  assert.equal(item.saves(), 0)
  assert.equal(item.stale(), 1)
  assert.match(item.render().error, /revocada/)
})
test('HU36: a confirmed cancellation blocks continued use of the previously downloaded snapshot', async () => {
  const item = setup(
    async () => {},
    async () => {
      throw {
        status: 409,
        code: 'EXAM_CANCELLED',
        message: 'Examen cancelado.',
      }
    },
  )
  await item.render().download()
  assert.equal(item.saves(), 0)
  assert.equal(item.stale(), 1)
})
test('HU36: an interrupted download is not saved after the component unmounts', async () => {
  let complete
  const response = new Promise((resolve) => {
    complete = resolve
  })
  const item = setup(
    async () => {},
    () => response,
  )
  const pending = item.render().download()
  item.harness.unmount()
  complete(packageFixture())
  await pending
  assert.equal(item.saves(), 0)
  assert.equal(item.notices.length, 0)
})
