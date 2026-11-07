import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'
import { localEntry, packageFixture } from './offlineFixtures.mjs'

globalThis.crypto ??= webcrypto
const rules = () =>
  sourceHarness().load('features/offline-entry/utils/offlineRules.ts')
const stored = () => ({
  ownerId: 7,
  examId: 42,
  staleReason: null,
  packet: packageFixture(),
})
test('HU36: local search accepts SIS, CI, names, surnames and multiple words', () => {
  const { searchOfflineStudents } = rules()
  const students = packageFixture().students
  for (const query of [
    '202600101',
    '70000101',
    'LUIS',
    'garcía',
    'García Luis',
  ])
    assert.equal(searchOfflineStudents(students, query).length, 1)
  assert.equal(searchOfflineStudents(students, 'otra persona').length, 0)
})
test('HU36: stale/expired packets and impossible clock references block new captures', () => {
  const { packageBlocker } = rules()
  assert.equal(
    packageBlocker(stored(), Date.parse('2027-01-15T14:05:00Z')),
    null,
  )
  assert.match(
    packageBlocker(stored(), Date.parse('2027-01-15T15:00:00Z')),
    /vencido/,
  )
  assert.match(
    packageBlocker(stored(), Date.parse('2027-01-15T13:00:00Z')),
    /reloj/,
  )
  assert.match(
    packageBlocker(stored(), Date.parse('2027-01-15T13:40:00Z')),
    /no comenzó/,
  )
  assert.equal(
    packageBlocker({ ...stored(), staleReason: 'Autorización revocada' }),
    'Autorización revocada',
  )
})
test('HU36: known eligibility, enrollment and duplicate events are conservative blockers', () => {
  const { studentBlocker } = rules()
  const student = packageFixture().students[0]
  assert.equal(studentBlocker(student, []), null)
  for (const status of [null, 'INELIGIBLE', 'NOT_ELIGIBLE'])
    assert.ok(studentBlocker({ ...student, eligibility_status: status }, []))
  assert.ok(studentBlocker({ ...student, enrollment_status: 'INACTIVE' }, []))
  assert.ok(studentBlocker({ ...student, entry_status: 'REGISTERED' }, []))
  for (const status of [
    'PENDING',
    'ACCEPTED',
    'DUPLICATE',
    'CONFLICT',
    'REJECTED',
  ])
    assert.match(
      studentBlocker(student, [localEntry(0, { status })]),
      /evento guardado/,
    )
})
test('HU36: manual capture uses one UUID, ISO time and only a member of the package', () => {
  const { capturePayload } = rules()
  const event = capturePayload(packageFixture(), 101, 'MANUAL')
  assert.match(event.event_id, /^[0-9a-f-]{36}$/)
  assert.equal(event.method, 'MANUAL')
  assert.ok(Number.isFinite(Date.parse(event.captured_at)))
  assert.equal('qr_token' in event, false)
  assert.throws(
    () => capturePayload(packageFixture(), 999, 'MANUAL'),
    /no pertenece/,
  )
  assert.throws(() => capturePayload(packageFixture(), 101, 'QR'), /Escanea/)
})
test('HU36: QR structure is provisional, opaque and never claims signature verification', () => {
  const { provisionalQr } = rules()
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ v: 2, jti: '1ba37ca3-1c61-4ed0-8740-a53776bb4d90', exp: 2_000_000_000 })}.unsigned`
  assert.equal(
    provisionalQr(token, 1_900_000_000_000),
    token,
    'A signature-looking string is not authenticated offline',
  )
  assert.throws(() => provisionalQr(token, 2_100_000_000_000), /vencido/)
  assert.throws(() => provisionalQr('student:101'), /formato/)
  assert.throws(
    () => provisionalQr(token.replace('unsigned', '<script>')),
    /formato/,
  )
})
