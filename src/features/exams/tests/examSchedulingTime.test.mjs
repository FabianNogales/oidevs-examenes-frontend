import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { compile, sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

const values = {
  name: 'Parcial', exam_date: '2026-10-21', start_time: '22:17',
  duration_minutes: '90', evaluation_type: 'partial', room_id: '7', rules: '',
}
const fixedNow = Date.parse('2026-10-21T22:15:40-04:00')
const futureError = 'La fecha y hora del examen deben estar en el futuro.'

function validationClock(initial = fixedNow) {
  let now = initial
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])) }
    static now() { return now }
  }
  const exports = {}
  const source = readFileSync(new URL('../utils/examValidation.ts', import.meta.url), 'utf8')
  new Function('exports', 'Date', compile(source))(exports, Clock)
  return { ...exports, jump: (milliseconds) => { now += milliseconds } }
}

for (const zone of ['UTC', 'America/La_Paz']) {
  test(`creation delegates time to Laravel in ${zone}, preserving the edit precheck`, () => {
    const previous = process.env.TZ
    process.env.TZ = zone
    try {
      const validation = validationClock()
      for (const [label, date, time, now, editAllowed] of [
        ['reported +80 seconds', '2026-10-21', '22:17', fixedNow, true],
        ['+1 minute', '2026-10-21', '22:16', '2026-10-21T22:15:00-04:00', true],
        ['+2 minutes', '2026-10-21', '22:17', '2026-10-21T22:15:00-04:00', true],
        ['equal', '2026-10-21', '22:15', '2026-10-21T22:15:00-04:00', false],
        ['past', '2026-10-21', '22:14', fixedNow, false],
        ['midnight', '2026-10-22', '00:00', '2026-10-21T23:59:40-04:00', true],
      ]) {
        const form = { ...values, exam_date: date, start_time: time }
        assert.deepEqual(validation.validateCreateExamForm(form), {}, label)
        assert.equal(Object.keys(validation.validateExamForm(form, new Date(now))).length === 0, editAllowed, label)
      }
      for (const deviceNow of [fixedNow - 86_400_000, fixedNow + 86_400_000]) {
        const clock = validationClock(deviceNow)
        assert.deepEqual(clock.validateCreateExamForm(values), {})
        assert.equal(Object.keys(clock.validateExamForm(values)).length === 0, deviceNow < fixedNow)
      }
      validation.jump(10 * 60_000)
      assert.deepEqual(validation.validateCreateExamForm(values), {}, 'an old form can consult the server')
      assert.ok(validation.validateExamForm(values).start_time, 'edit still checks the current clock')
    } finally {
      if (previous === undefined) delete process.env.TZ
      else process.env.TZ = previous
    }
  })
}

test('creation and editing keep required fields, real dates, time formats and numeric limits', () => {
  const validation = validationClock()
  for (const [field, invalid] of [
    ['name', ''], ['name', 'x'.repeat(256)], ['evaluation_type', 'invalid'],
    ['exam_date', ''], ['exam_date', '2026-02-30'], ['exam_date', '21/10/2026'],
    ['start_time', ''], ['start_time', '24:00'], ['start_time', '22:17:00'],
    ['duration_minutes', '0'], ['duration_minutes', '1.5'], ['duration_minutes', '2147483648'],
    ['room_id', ''], ['room_id', '0'], ['room_id', '1.5'],
  ]) {
    const form = { ...values, [field]: invalid }
    assert.ok(validation.validateCreateExamForm(form)[field], `${field}: ${invalid}`)
    assert.ok(validation.validateExamForm(form)[field], `${field}: ${invalid}`)
  }
})

// Arqmoc 45a1754 replaced ExamFormFields with ExamScheduler/*, driven by useExamSchedulerState.
// These tests replace that hook at the module boundary, as the earlier ones replaced useAvailableRooms.
function schedulerState(overrides = {}) {
  return {
    examDate: values.exam_date, startTime: values.start_time, durationString: values.duration_minutes,
    durationMinutes: 90, evaluationType: 'partial', partialNumber: '1', defaultPartialNumber: '1',
    primaryRoomId: values.room_id, selectedRoomIds: [values.room_id], consentedSharedRoomIds: new Set(),
    isSharedRoomEnabled: false, isSelectionValid: true, areAllSelectedRoomsValid: true,
    roomsState: { roomError: null, isReady: true, reload() {} },
    setPartialNumber() {}, setEvaluationType() {}, setSelectedRoomIds() {},
    ...overrides,
  }
}
const guard = { useExamNavigationGuard: () => ({ blocked: false, allowNavigation() {}, stay() {}, discard() {} }) }
const workspace = (tree) => nodes(tree, (node) => node.type === 'workspace')[0]
const schedulerSeams = (scheduler) => ({
  '../hooks/useExamSchedulerState': { useExamSchedulerState: () => scheduler },
  '../hooks/useExamNavigationGuard': guard,
  './ExamScheduler/ExamSchedulerWorkspace': { ExamSchedulerWorkspace: 'workspace' },
  './ExamScheduler/ExamNavigationGuardBanner': { ExamNavigationGuardBanner: 'guard-banner' },
  './ExamScheduler/ExamSubjectBanner': { ExamSubjectBanner: 'subject-banner' },
})

function creationHarness(clock, post = async () => ({ data: { data: { id: 1 } } })) {
  const calls = []
  const created = []
  const h = sourceHarness({
    ...schedulerSeams(schedulerState()),
    '@/features/exams/utils/examValidation': clock,
    '../utils/examValidation': clock,
    '@/shared/api/httpClient': { httpClient: { post: async (...args) => {
      calls.push(args)
      return post(...args)
    } } },
  })
  const { createExam } = h.load('features/exams/api/teacherExamsApi.ts')
  const { CreateExamForm } = h.load('features/exams/components/CreateExamForm.tsx')
  const { BuildDefaultExamName } = h.load('features/exams/utils/examScheduleFormatters.ts')
  let tree
  const render = () => {
    tree = h.render(() => CreateExamForm({
      subject: { courseOfferingId: 3, name: 'Programación', academicManagement: 'II/2026' },
      onCancel() {}, onCreated: (id) => created.push(id),
      onSubmit: async (payload, subject) => (await createExam(subject.courseOfferingId, payload)).id,
    }))
    return tree
  }
  return {
    h, calls, created, render, expectedName: BuildDefaultExamName('partial', '1'),
    workspace: () => workspace(tree),
    save: async () => {
      render()
      assert.equal(workspace(tree).props.controlsDisabled, false)
      tree.props.onSubmit({ preventDefault() {} })
      await settle()
      return render()
    },
  }
}

function mockFrames(t) {
  t.mock.method(globalThis, 'requestAnimationFrame', () => 1)
  t.mock.method(globalThis, 'cancelAnimationFrame', () => {})
}

// Node has no animation frames. Restore these globals after this test file.
const originalFrames = [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame]
globalThis.requestAnimationFrame ??= () => 1
globalThis.cancelAnimationFrame ??= () => {}
after(() => {
  for (const [index, name] of ['requestAnimationFrame', 'cancelAnimationFrame'].entries()) {
    if (originalFrames[index] === undefined) delete globalThis[name]
    else globalThis[name] = originalFrames[index]
  }
})

for (const skew of [-86_400_000, 0, 86_400_000]) {
  test(`creation submits unchanged institutional fields with device skew ${skew}`, async (t) => {
    mockFrames(t)
    const clock = validationClock(fixedNow + skew)
    const ui = creationHarness(clock)
    await ui.save()
    assert.equal(ui.calls.length, 1)
    assert.equal(ui.calls[0][0], '/course-offerings/3/exams')
    assert.deepEqual(ui.calls[0][1], {
      name: ui.expectedName, exam_date: values.exam_date, start_time: '22:17:00', duration_minutes: 90,
      room_id: 7, evaluation_type: 'partial', partial_number: 1, is_shared_room: false,
      shared_consent: false, additional_room_ids: [], rules: null,
    })
    assert.deepEqual(ui.created, [1])
    ui.h.unmount()
  })
}

test('a delayed form submits and displays the real API wrapper 422', async (t) => {
  mockFrames(t)
  const clock = validationClock()
  const ui = creationHarness(clock, async () => {
    throw { isAxiosError: true, response: { status: 422, data: {
      message: 'The given data was invalid.', errors: { start_time: [futureError] },
    } } }
  })
  clock.jump(10 * 60_000)
  await ui.save()
  assert.equal(ui.calls.length, 1, 'creation still lets Laravel decide an elapsed start')
  assert.deepEqual(ui.created, [])
  // Ambiguous contract (D3): the scheduler shows the generic 422 summary first, not the start_time detail.
  assert.equal(ui.workspace().props.activeErrorMessage, 'Revisa los datos seleccionados para programar la evaluación.')
  ui.h.unmount()
})

function formattersClock(deviceNow) {
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [deviceNow])) }
    static now() { return deviceNow }
  }
  const exports = {}
  const source = readFileSync(new URL('../utils/examScheduleFormatters.ts', import.meta.url), 'utf8')
  new Function('exports', 'Date', compile(source))(exports, Clock)
  return exports
}
const calendarDay = (formatters, iso) => {
  const today = formatters.GetCurrentTimezoneDate('America/La_Paz')
  return formatters.BuildCalendarMonthCells(2026, 9, today.todayIso).find((cell) => cell.isoDate === iso)
}

test('editing retains its calendar minimum from the device date', () => {
  const formatters = formattersClock(fixedNow + 86_400_000)
  assert.equal(formatters.GetCurrentTimezoneDate('America/La_Paz').todayIso, '2026-10-22')
  assert.equal(calendarDay(formatters, '2026-10-21').isPastDate, true)
  assert.equal(calendarDay(formatters, '2026-10-22').isPastDate, false)
})

test('creation calendar does not enforce the device date minimum', {
  todo: 'D3 blocker: ExamScheduler (Arqmoc 45a1754) disables past days for creation too; product decision pending',
}, () => {
  // The creation workspace builds its calendar with the same device-based todayIso as editing.
  const formatters = formattersClock(fixedNow + 86_400_000)
  assert.equal(calendarDay(formatters, '2026-10-21').isPastDate, false)
})

test('the real edit form still blocks elapsed starts and submits future rescheduling', async (t) => {
  mockFrames(t)
  for (const delay of [0, 10 * 60_000]) {
    const clock = validationClock()
    const calls = []
    const h = sourceHarness({
      ...schedulerSeams(schedulerState({ startTime: '22:18' })),
      'react-router': { useNavigate: () => () => {} },
      '../utils/examValidation': clock,
      '../api/examMutationsApi': {
        ExamMutationError: class extends Error {},
        updateExam: async (...args) => { calls.push(args) },
      },
    })
    const { EditExamForm } = h.load('features/exams/components/EditExamForm.tsx')
    const exam = { ...values, id: 1, start_time: '22:17:00', duration_minutes: 90, room: { id: 7 } }
    let tree
    const render = () => { tree = h.render(() => EditExamForm({ exam, backTo: '/', onSaved() {} })); return tree }
    render()
    assert.equal(workspace(tree).props.canSubmit, true)
    clock.jump(delay)
    tree.props.onSubmit({ preventDefault() {} })
    await settle()
    render()
    assert.equal(calls.length, delay === 0 ? 1 : 0)
    if (delay) {
      const expected = clock.validateExamForm({ ...values, start_time: '22:18' }).start_time
      assert.ok(expected)
      assert.equal(workspace(tree).props.activeErrorMessage, expected)
    } else assert.equal(calls[0][1].start_time, '22:18:00')
    h.unmount()
  }
})
