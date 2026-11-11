import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, settle } from '../../../shared/tests/sourceHarness.mjs'
import { exam, filters, report } from './reportFixtures.mjs'
function setup(handler) {
  const calls = []
  const h = sourceHarness({
    '../api/examReportsApi': {
      getExamReport: (...args) => {
        calls.push(args)
        return handler(...args)
      },
    },
  })
  return { h, calls, ...h.load('features/exam-reports/hooks/useExamReport.ts') }
}
test('HU33 generation is serialized and invalidating filters aborts old data, including late responses', async () => {
  let resolve
  const a = setup(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  let hook = a.h.render(() => a.useExamReport(exam))
  const first = hook.generate(filters)
  hook.generate(filters)
  assert.equal(a.calls.length, 1)
  hook = a.h.render()
  assert.equal(hook.busy, true)
  hook.invalidate()
  assert.equal(a.calls[0][4].aborted, true)
  resolve(report())
  await first
  await settle()
  hook = a.h.render()
  assert.equal(hook.data, null)
  assert.equal(hook.busy, false)
  a.h.unmount()
})
test('HU33 pagination carries the original snapshot and expired errors remove data without automatic retries', async () => {
  let fail = false
  const a = setup(async () => {
    if (fail) throw new Error('El reporte venció.')
    return report()
  })
  let hook = a.h.render(() => a.useExamReport(exam))
  await hook.generate(filters)
  hook = a.h.render()
  assert.equal(hook.data.report.id, 'snapshot-1')
  fail = true
  await hook.changePage(2)
  assert.equal(a.calls[1][2], 2)
  assert.equal(a.calls[1][3].id, 'snapshot-1')
  hook = a.h.render()
  assert.equal(hook.data, null)
  assert.equal(hook.error, 'El reporte venció.')
  assert.equal(a.calls.length, 2)
  a.h.unmount()
})
test('HU33 leaving the exam aborts pending generation so it cannot populate the next view', async () => {
  let finish
  const a = setup(
    () =>
      new Promise((done) => {
        finish = done
      }),
  )
  const hook = a.h.render(() => a.useExamReport(exam))
  const promise = hook.generate(filters)
  a.h.unmount()
  assert.equal(a.calls[0][4].aborted, true)
  finish(report())
  await promise
  assert.equal(a.calls.length, 1)
})
