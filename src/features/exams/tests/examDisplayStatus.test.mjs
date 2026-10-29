import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { compile } from '../../../shared/tests/sourceHarness.mjs'
const exports = {}
new Function('exports', compile(readFileSync(new URL('../utils/examDisplayStatus.ts', import.meta.url), 'utf8')))(exports)
const exam = { status: 'SCHEDULED', exam_date: '2026-10-26', start_time: '23:30:00', duration_minutes: 90 }
const end = Date.parse('2026-10-27T01:00:00-04:00')
test('display expiry uses La Paz and exclusive end, including midnight', () => {
  assert.equal(exports.examDisplayStatus(exam, end - 1), 'SCHEDULED')
  assert.equal(exports.examDisplayStatus(exam, end), 'EXPIRED')
  assert.equal(exports.examDisplayStatus({ ...exam, status: 'IN_PROGRESS' }, end), 'TIME_ENDED')
  for (const status of ['CANCELLED', 'COMPLETED', 'FINISHED']) assert.equal(exports.examDisplayStatus({ ...exam, status }, end), status)
  assert.equal(exports.examDisplayStatus({ ...exam, start_time: null }, end), 'SCHEDULED')
  assert.equal(exam.status, 'SCHEDULED')
})

test('all supported states have consistent labels and final states take precedence over dates', () => {
  const labels = { SCHEDULED: 'Programado', ACTIVE: 'Programado', IN_PROGRESS: 'En curso', CANCELLED: 'Cancelado', COMPLETED: 'Finalizado', FINISHED: 'Finalizado', EXPIRED: 'Vencido', TIME_ENDED: 'Horario concluido' }
  for (const [status, label] of Object.entries(labels)) assert.equal(exports.examStatusLabel(status), label)
  assert.equal(exports.examStatusLabel('UNKNOWN'), 'Estado no disponible')
  assert.equal(exports.examDisplayStatus({ ...exam, status: 'ACTIVE' }, end), 'EXPIRED')
  assert.equal(exports.examDisplayStatus({ ...exam, start_time: '23:30' }, end), 'EXPIRED')
  assert.equal(exports.examDisplayStatus({ ...exam, start_time: 'invalid' }, end), 'SCHEDULED')
})
