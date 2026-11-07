import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import { compile } from '../../../shared/tests/sourceHarness.mjs'

function context() {
  const session = new Map()
  const local = new Map()
  const target = new EventTarget()
  let now = Date.now()
  class Clock extends Date {
    static now() {
      return now
    }
  }
  const storage = (map) => ({
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  })
  target.opener = null
  const module = { exports: {} }
  new Function(
    'require',
    'module',
    'exports',
    'sessionStorage',
    'localStorage',
    'window',
    'crypto',
    'Date',
    'Event',
    compile(
      readFileSync(
        new URL('../services/offlineIdentity.ts', import.meta.url),
        'utf8',
      ),
    ),
  )(
    () => {
      throw new Error('unexpected runtime dependency')
    },
    module,
    module.exports,
    storage(session),
    storage(local),
    target,
    webcrypto,
    Clock,
    Event,
  )
  return {
    ...module.exports,
    session,
    target,
    advance: (delta) => {
      now += delta
    },
  }
}
const user = (id = 7) => ({
  id,
  display_name: 'Ana Pérez',
  status: 'ACTIVE',
  must_change_password: false,
  email: 'not-to-store@example.test',
  roles: ['DOCENTE'],
})
test('offline continuity stores no email, roles, credential or session token and isolates accounts', () => {
  const identity = context()
  identity.rememberOfflineIdentity(user())
  assert.equal(identity.readOfflineIdentity().ownerId, 7)
  assert.ok(![...identity.session.values()].join('').includes('not-to-store'))
  assert.throws(() => identity.assertOfflineOwner(8), /cuenta/)
  identity.rememberOfflineIdentity(user(8))
  assert.throws(() => identity.assertOfflineOwner(7), /cuenta/)
})
test('verified same-account refresh preserves context; logout/relogin rotates it', () => {
  const identity = context()
  identity.rememberOfflineIdentity(user())
  const first = identity.readOfflineIdentity().contextId
  identity.rememberOfflineIdentity(user())
  assert.equal(identity.readOfflineIdentity().contextId, first)
  identity.invalidateOfflineIdentity()
  assert.equal(identity.readOfflineIdentity(), null)
  identity.rememberOfflineIdentity(user())
  assert.notEqual(identity.readOfflineIdentity().contextId, first)
  assert.throws(() => identity.assertOfflineOwner(7, first), /cuenta/)
})
test('expired contexts, inactive users and password-change users cannot restore local access', () => {
  const identity = context()
  identity.rememberOfflineIdentity(user())
  identity.advance(24 * 60 * 60 * 1000)
  assert.equal(identity.readOfflineIdentity(), null)
  identity.rememberOfflineIdentity({ ...user(), status: 'INACTIVE' })
  assert.equal(identity.readOfflineIdentity(), null)
  identity.rememberOfflineIdentity({ ...user(), must_change_password: true })
  assert.equal(identity.readOfflineIdentity(), null)
})
test('opener-created tabs discard inherited local continuity', () => {
  const identity = context()
  identity.rememberOfflineIdentity(user())
  identity.target.opener = {}
  identity.discardInheritedOfflineIdentity()
  assert.equal(identity.readOfflineIdentity(), null)
})
