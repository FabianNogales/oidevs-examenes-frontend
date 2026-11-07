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

function creationHarness(clock, post = async () => ({ data: { data: { id: 1 } } })) {
  const calls = []
  const h = sourceHarness({
    '@/features/exams/utils/examValidation': clock,
    '../utils/examValidation': clock,
    '@/features/exams/hooks/useAvailableRooms': { useAvailableRooms: () => ({
      rooms: [{ id: 7, code: 'A-07', name: 'Aula 7' }], roomError: null,
      isLoadingRooms: false, hasSchedule: true, isReady: true,
    }) },
    '../hooks/useExamNavigationGuard': { useExamNavigationGuard: () => ({ blocked: false, allowNavigation() {} }) },
    '@/shared/api/httpClient': { httpClient: { post: async (...args) => {
      calls.push(args)
      return post(...args)
    } } },
  })
  const { createExam } = h.load('features/exams/api/teacherExamsApi.ts')
  const { CreateExamForm } = h.load('features/exams/components/CreateExamForm.tsx')
  let tree
  const render = () => {
    tree = h.render(() => CreateExamForm({
      subject: { courseOfferingId: 3, name: 'Programación', academicManagement: 'II/2026' },
      onCancel() {}, onCreated() {}, onSubmit: async (payload, subject) => (await createExam(subject.courseOfferingId, payload)).id,
    }))
    return tree
  }
  const fields = () => nodes(tree, (node) => typeof node.type === 'function' && node.props.values)[0]
  return {
    h, calls, render, fields,
    fill: () => {
      render()
      for (const [field, value] of Object.entries(values)) fields().props.onChange(field, value)
      render()
    },
    save: async () => {
      const button = nodes(tree, (node) => node.type === 'button' && textContent(node) === 'Guardar examen')[0]
      assert.equal(button.props.disabled, false)
      tree.props.onSubmit({ preventDefault() {} })
      await settle()
      render()
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
    ui.fill()
    assert.equal(ui.fields().props.enforceDateMinimum, false)
    await ui.save()
    assert.equal(ui.calls.length, 1)
    assert.equal(ui.calls[0][0], '/course-offerings/3/exams')
    assert.deepEqual(ui.calls[0][1], {
      ...values, start_time: '22:17:00', duration_minutes: 90, room_id: 7, rules: null,
    })
    ui.h.unmount()
  })
}

test('a delayed form submits and displays the real API wrapper 422 under the time field', async (t) => {
  mockFrames(t)
  const clock = validationClock()
  const ui = creationHarness(clock, async () => {
    throw { isAxiosError: true, response: { status: 422, data: {
      message: 'The given data was invalid.', errors: { start_time: [futureError] },
    } } }
  })
  ui.fill()
  clock.jump(10 * 60_000)
  await ui.save()
  assert.equal(ui.calls.length, 1)
  assert.equal(ui.fields().props.errors.start_time, futureError)
  assert.match(textContent(ui.render()), /Revisa los datos ingresados/)
  const fieldsTree = ui.h.render(() => ui.fields().type(ui.fields().props))
  assert.match(textContent(fieldsTree), /La fecha y hora del examen deben estar en el futuro/)
  ui.h.unmount()
})

test('calendar minimum is disabled only for creation and editing retains its institutional minimum', () => {
  const clock = validationClock(fixedNow + 86_400_000)
  const h = sourceHarness({ '../utils/examValidation': clock })
  const { ExamFormFields } = h.load('features/exams/components/ExamFormFields.tsx')
  const props = { values, errors: {}, roomsState: { rooms: [], hasSchedule: true }, disabled: false, onChange() {} }
  const creation = h.render(() => ExamFormFields({ ...props, enforceDateMinimum: false }))
  assert.equal(nodes(creation, (node) => node.props.type === 'date')[0].props.min, undefined)
  const edit = h.render(() => ExamFormFields(props))
  assert.equal(nodes(edit, (node) => node.props.type === 'date')[0].props.min, '2026-10-22')
})

test('the real edit form still blocks elapsed starts and submits future rescheduling', async (t) => {
  mockFrames(t)
  for (const delay of [0, 10 * 60_000]) {
    const clock = validationClock()
    const calls = []
    const h = sourceHarness({
      'react-router': { useNavigate: () => () => {} },
      '../utils/examValidation': clock,
      '../hooks/useAvailableRooms': { useAvailableRooms: () => ({
        rooms: [{ id: 7 }], isReady: true, roomError: null, reload() {},
      }) },
      '../hooks/useExamNavigationGuard': { useExamNavigationGuard: () => ({ blocked: false, allowNavigation() {} }) },
      '../api/examMutationsApi': {
        ExamMutationError: class extends Error {},
        updateExam: async (...args) => { calls.push(args) },
      },
    })
    const { EditExamForm } = h.load('features/exams/components/EditExamForm.tsx')
    const exam = { ...values, id: 1, start_time: '22:17:00', duration_minutes: 90, room: { id: 7 } }
    let tree
    const render = () => { tree = h.render(() => EditExamForm({ exam, backTo: '/', onSaved() {} })); return tree }
    const fields = () => nodes(tree, (node) => typeof node.type === 'function' && node.props.values)[0]
    render()
    fields().props.onChange('start_time', '22:18')
    render()
    fields().props.onChange('room_id', '7')
    render()
    clock.jump(delay)
    tree.props.onSubmit({ preventDefault() {} })
    await settle()
    render()
    assert.equal(calls.length, delay === 0 ? 1 : 0)
    if (delay) assert.ok(fields().props.errors.start_time)
    else assert.equal(calls[0][1].start_time, '22:18:00')
    assert.equal(fields().props.enforceDateMinimum, undefined, 'edit uses its existing calendar policy')
    h.unmount()
  }
})
