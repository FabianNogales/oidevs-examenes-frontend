import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const h = sourceHarness()
const formatters = h.load('features/exams/utils/examScheduleFormatters.ts')
const validation = h.load('features/exams/utils/examValidation.ts')

test('institutional room reservation blocks span 06:45 to 21:45 in 10 fixed 90-minute periods', () => {
  assert.equal(formatters.ROOM_RESERVATION_BLOCKS.length, 10)
  assert.equal(formatters.ROOM_RESERVATION_BLOCKS[0].start, '06:45')
  assert.equal(formatters.ROOM_RESERVATION_BLOCKS[0].end, '08:15')
  assert.equal(formatters.ROOM_RESERVATION_BLOCKS[9].start, '20:15')
  assert.equal(formatters.ROOM_RESERVATION_BLOCKS[9].end, '21:45')
})

test('exam duration automatically reserves 1 to 3 periods and caps at 270 minutes', () => {
  assert.equal(formatters.CalculateRequiredBlocks(30), 1)
  assert.equal(formatters.CalculateRequiredBlocks(90), 1)
  assert.equal(formatters.CalculateRequiredBlocks(120), 2)
  assert.equal(formatters.CalculateRequiredBlocks(180), 2)
  assert.equal(formatters.CalculateRequiredBlocks(181), 3)
  assert.equal(formatters.CalculateRequiredBlocks(270), 3)
  assert.equal(formatters.ClampExamDuration(360), 270)

  const twoHours = formatters.ResolveReservationWindow('06:45', 120)
  assert.equal(twoHours.isValid, true)
  assert.equal(twoHours.blockCount, 2)
  assert.deepEqual(twoHours.coveredIndexes, [0, 1])
  assert.equal(twoHours.startTime, '06:45')
  assert.equal(twoHours.endTime, '09:45')
  assert.equal(twoHours.reservedMinutes, 180)

  const threePeriods = formatters.ResolveReservationWindow('06:45', 240)
  assert.equal(threePeriods.isValid, true)
  assert.equal(threePeriods.blockCount, 3)
  assert.deepEqual(threePeriods.coveredIndexes, [0, 1, 2])
  assert.equal(threePeriods.endTime, '11:15')

  const overflowsDay = formatters.ResolveReservationWindow('20:15', 120)
  assert.equal(overflowsDay.isValid, false)
})

test('recovery evaluation type is valid and has no partial number in default name', () => {
  assert.equal(formatters.BuildDefaultExamName('recovery', '4'), 'Examen Recuperatorio')
  const errors = validation.validateCreateExamForm({
    name: 'Examen Recuperatorio',
    exam_date: '2026-11-25',
    start_time: '09:45',
    duration_minutes: '120',
    evaluation_type: 'recovery',
    room_id: '5',
    rules: '',
  })
  assert.deepEqual(errors, {})
})

test('room search sanitizes to lowercase alphanumeric only with a 25-character limit', () => {
  assert.equal(formatters.SanitizeRoomSearchQuery('Ául@ QA-101 #2!'), 'aulqa1012')
  assert.equal(
    formatters.SanitizeRoomSearchQuery('abcdefghijklmnopqrstuvwxyz12345'),
    'abcdefghijklmnopqrstuvwxy',
  )
  assert.equal(
    formatters.SanitizeRoomSearchQuery('abcdefghijklmnopqrstuvwxyz12345').length,
    25,
  )

  const room = { id: 1, code: 'QA-101', name: 'FULLQA Aula A', location: 'Bloque Norte' }
  assert.equal(formatters.RoomMatchesSearch(room, 'qa101'), true)
  assert.equal(formatters.RoomMatchesSearch(room, 'aulaa'), true)
  assert.equal(formatters.RoomMatchesSearch(room, 'lab99'), false)
})

test('calendar marks dates outside the academic term range as unavailable', () => {
  const term = { name: 'II/2026', startDate: '2026-08-01', endDate: '2026-11-20' }
  assert.equal(formatters.IsDateWithinAcademicTerm('2026-11-20', term), true)
  assert.equal(formatters.IsDateWithinAcademicTerm('2026-11-21', term), false)

  const cells = formatters.BuildCalendarMonthCells(2026, 10, '2026-11-10', term)
  const inside = cells.find((c) => c.isoDate === '2026-11-20')
  const outside = cells.find((c) => c.isoDate === '2026-11-21')
  assert.equal(inside.isOutsideTerm, false)
  assert.equal(outside.isOutsideTerm, true)
})
