import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'
import {
  distributionFixture,
  localEntry,
  packageFixture,
} from './offlineFixtures.mjs'

const contract = () =>
  sourceHarness().load('features/offline-entry/utils/offlineContract.ts')
test('HU35: accepts actual distribution and rejects duplicate membership, wrong list and incorrect counts', () => {
  const { parseDistribution } = contract()
  assert.equal(
    parseDistribution(distributionFixture(), 42).lists[0].responsible_id,
    7,
  )
  const duplicate = distributionFixture()
  duplicate.lists.push({
    ...duplicate.lists[0],
    list_id: 9,
    responsible_id: 10,
    students: [{ ...duplicate.lists[0].students[0], list_id: 9 }],
  })
  assert.throws(() => parseDistribution(duplicate, 42), /duplicadas/)
  const wrongList = distributionFixture()
  wrongList.lists[0].students[0].list_id = 99
  assert.throws(() => parseDistribution(wrongList, 42), /otra lista/)
  const wrongCount = distributionFixture()
  wrongCount.lists[0].student_count = 2
  assert.throws(() => parseDistribution(wrongCount, 42), /tamaño/)
})
test('HU36: projects minimal package fields and rejects different account, exam, version and malformed dates', () => {
  const { parseOfflinePackage } = contract()
  const raw = {
    ...packageFixture(),
    password: 'never-store',
    access_code_hash: 'never-store',
    cookies: 'never-store',
  }
  raw.students[0].email = 'never-store@example.test'
  const clean = parseOfflinePackage(raw, 42, 7)
  assert.equal(clean.students[0].identity_number, '70000101')
  assert.ok(!JSON.stringify(clean).includes('never-store'))
  assert.throws(() => parseOfflinePackage(raw, 42, 8), /cuenta/)
  assert.throws(() => parseOfflinePackage(raw, 43, 7), /cuenta/)
  assert.throws(() => parseOfflinePackage({ ...raw, version: 0 }, 42, 7))
  assert.throws(() =>
    parseOfflinePackage({ ...raw, expires_at: 'yesterday' }, 42, 7),
  )
})
test('HU36: rejects duplicate students and mismatched room, permits an empty assigned list', () => {
  const { parseOfflinePackage } = contract()
  const packet = packageFixture()
  assert.throws(
    () =>
      parseOfflinePackage(
        { ...packet, students: [...packet.students, ...packet.students] },
        42,
        7,
      ),
    /duplicadas/,
  )
  assert.throws(
    () => parseOfflinePackage({ ...packet, room_id: 99 }, 42, 7),
    /condiciones/,
  )
  const empty = parseOfflinePackage(
    { ...packet, students: [], surname_range: { from: null, to: null } },
    42,
    7,
  )
  assert.equal(empty.students.length, 0)
})
test('HU37: recognizes all four real result statuses without treating conflict/rejection as attendance', () => {
  const { parseSyncResults } = contract()
  const events = Array.from(
    { length: 4 },
    (_, index) => localEntry(index).payload,
  )
  const results = ['ACCEPTED', 'DUPLICATE', 'CONFLICT', 'REJECTED'].map(
    (status, index) => ({
      event_id: events[index].event_id,
      status,
      code: 'VALIDATION_RESULT',
      message: 'Resultado del servidor.',
      entry_id: index < 2 ? 501 : null,
    }),
  )
  const parsed = parseSyncResults({ exam_id: 42, results }, 42, { events })
  assert.deepEqual(
    parsed.map((row) => row.status),
    ['ACCEPTED', 'DUPLICATE', 'CONFLICT', 'REJECTED'],
  )
  assert.equal(parsed[2].entry_id, null)
})
test('HU37: incomplete, repeated or foreign responses do not acknowledge pending events', () => {
  const { parseSyncResults } = contract()
  const event = localEntry().payload
  const result = {
    event_id: event.event_id,
    status: 'ACCEPTED',
    code: 'ENTRY_REGISTERED',
    message: 'Ingreso registrado.',
    entry_id: 501,
  }
  assert.throws(
    () =>
      parseSyncResults({ exam_id: 42, results: [] }, 42, { events: [event] }),
    /todos/,
  )
  assert.throws(
    () =>
      parseSyncResults({ exam_id: 42, results: [result, result] }, 42, {
        events: [event],
      }),
    /duplicadas/,
  )
  assert.throws(
    () =>
      parseSyncResults({ exam_id: 43, results: [result] }, 42, {
        events: [event],
      }),
    /otro examen/,
  )
  assert.throws(
    () =>
      parseSyncResults(
        { exam_id: 42, results: [{ ...result, entry_id: null }] },
        42,
        { events: [event] },
      ),
    /oficial/,
  )
  assert.throws(
    () =>
      parseSyncResults(
        { exam_id: 42, results: [{ ...result, status: 'OK' }] },
        42,
        { events: [event] },
      ),
    /desconocido/,
  )
})
