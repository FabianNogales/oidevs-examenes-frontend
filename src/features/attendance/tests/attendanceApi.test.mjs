import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'
import {
  page,
  base,
  query,
  activity,
  list,
  student,
  pending,
} from './attendanceFixtures.mjs'
function setup(result = page) {
  const calls = []
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        get: async (...args) => {
          calls.push(args)
          if (result instanceof Error) throw result
          return { data: result }
        },
      },
    },
  })
  return { ...h.load('features/attendance/api/attendanceApi.ts'), calls, h }
}
test('HU32 validates official totals and server scope, sends only supported filters', async () => {
  const a = setup()
  assert.deepEqual(
    await a.getAttendanceStudents(4, { ...query, search: '  Ana  ' }),
    page,
  )
  assert.deepEqual(a.calls[0][1].params, {
    view: 'all',
    search: 'Ana',
    page: 1,
    per_page: 10,
  })
  for (const q of [
    { ...query, page: 0 },
    { ...query, view: 'offline' },
    { ...query, list_id: 0 },
    { ...query, search: 'x'.repeat(256) },
  ])
    await assert.rejects(a.getAttendanceStudents(4, q), (e) => e.status === 422)
  assert.equal(a.calls.length, 1)
})
test('HU32 rejects mismatched exam, stale or offline snapshots, broken counters, percentage and timestamps', async () => {
  for (const patch of [
    { exam: { ...base.exam, id: 5 } },
    { is_current: false },
    { source: 'LOCAL' },
    { summary: { ...base.summary, pending: 0 } },
    { summary: { ...base.summary, attendance_percentage: 100 } },
    { last_updated_at: '2026-11-03' },
    { offline: { ...base.offline, pending_count: 0 } },
    { offline: { ...base.offline, included_in_official_attendance: true } },
  ])
    await assert.rejects(
      setup({ ...page, ...patch }).getAttendanceStudents(4, query),
    )
})
test('HU32 pending and registered lists must agree with official entries and filters', async () => {
  const registered = {
    ...page,
    data: [student],
    meta: { ...page.meta, total: 1 },
  }
  assert.equal(
    (
      await setup(registered).getAttendanceStudents(4, {
        ...query,
        view: 'registered',
      })
    ).data[0].attendance_status,
    'SERVER_CONFIRMED',
  )
  for (const patch of [
    { data: [pending], meta: { ...page.meta, total: 1 } },
    { data: [{ ...student, entry: null }], meta: { ...page.meta, total: 1 } },
  ])
    await assert.rejects(
      setup({ ...page, ...patch }).getAttendanceStudents(4, {
        ...query,
        view: 'registered',
      }),
    )
  await assert.rejects(
    setup({ ...page, data: [student, student, pending] }).getAttendanceStudents(
      4,
      query,
    ),
  )
  await assert.rejects(
    setup({
      ...page,
      data: [student],
      meta: { ...page.meta, total: 1 },
    }).getAttendanceStudents(4, query),
  )
})
test('HU32 search does not replace global totals and accepts an outgrown page for UI recovery', async () => {
  assert.deepEqual(
    (
      await setup({
        ...page,
        data: [student],
        meta: { ...page.meta, total: 1 },
      }).getAttendanceStudents(4, { ...query, search: '00123' })
    ).summary,
    base.summary,
  )
  assert.equal(
    (
      await setup({
        ...page,
        data: [],
        meta: { ...page.meta, current_page: 2 },
      }).getAttendanceStudents(4, { ...query, page: 2 })
    ).data.length,
    0,
  )
})
test('HU32 offline pending can be shown separately without changing official attendance', async () => {
  const response = {
    ...page,
    offline: {
      available_on_server: true,
      pending_count: 4,
      included_in_official_attendance: false,
    },
  }
  assert.equal(
    (await setup(response).getAttendanceStudents(4, query)).summary.registered,
    1,
  )
})
test('HU32 lists require explicit availability, scoped identity and coherent totals', async () => {
  const value = {
    ...page,
    exclusive_lists: { available: true, data: [list] },
    selected_list: list,
  }
  assert.equal(
    (await setup(value).getAttendanceStudents(4, { ...query, list_id: 12 }))
      .selected_list.id,
    12,
  )
  await assert.rejects(
    setup(value).getAttendanceStudents(4, { ...query, list_id: 99 }),
  )
  await assert.rejects(
    setup(page).getAttendanceStudents(4, { ...query, list_id: 12 }),
  )
  await assert.rejects(
    setup({
      ...page,
      exclusive_lists: { available: true, data: [list, { ...list }] },
    }).getAttendanceStudents(4, query),
  )
})
test('HU32 collaborator activity is not falsely presented as assigned list progress', async () => {
  assert.equal(
    (await setup(activity).getAttendanceActivity(4)).collaborators.data[0]
      .assigned_total,
    null,
  )
  for (const patch of [
    {
      ...activity.collaborators,
      data: [{ ...activity.collaborators.data[0], valid_registered: 2 }],
    },
    {
      ...activity.collaborators,
      data: [{ ...activity.collaborators.data[0], assigned_total: 3 }],
    },
  ])
    await assert.rejects(
      setup({ ...activity, collaborators: patch }).getAttendanceActivity(4),
    )
})
test('HU32 HTTP and missing functionality errors never become valid empty counters', async () => {
  for (const status of [401, 403, 404, 422, 501, 503]) {
    const e = Object.assign(new Error('HTTP'), {
      isAxiosError: true,
      response: { status },
    })
    await assert.rejects(
      setup(e).getAttendanceStudents(4, query),
      (err) => err.status === status,
    )
  }
})
