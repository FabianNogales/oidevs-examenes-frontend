import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'
import {
  exam,
  catalog,
  filters,
  report,
  row,
  entry,
  pending,
  incident,
  infraction,
  expulsion,
} from './reportFixtures.mjs'
function setup(value = report()) {
  const calls = []
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        get: async (...args) => {
          calls.push(args)
          if (value instanceof Error) throw value
          return value?.headers ? value : { data: value }
        },
      },
    },
  })
  return { ...h.load('features/exam-reports/api/examReportsApi.ts'), h, calls }
}
test('HU33 catalog validates authorized exam, subject and term scopes, preserving codes', async () => {
  const api = setup(catalog)
  assert.deepEqual(
    await api.getReportCatalog({
      page: 1,
      search: '  Redes  ',
      subject_id: 2,
      academic_term_id: 3,
    }),
    catalog,
  )
  assert.equal(api.calls[0][1].params.search, 'Redes')
  for (const q of [
    { page: 0, search: '' },
    { page: 1, search: '', subject_id: 0 },
  ])
    await assert.rejects(api.getReportCatalog(q), (e) => e.status === 422)
  for (const patch of [
    { data: [{ ...exam, id: 5 }] },
    { data: [{ ...exam, subject: { ...exam.subject, id: 99 } }] },
    { data: [{ ...exam, academic_term: { ...exam.academic_term, id: 99 } }] },
  ])
    await assert.rejects(
      setup({ ...catalog, ...patch }).getReportCatalog({
        page: 1,
        search: '',
        exam_id: 4,
        subject_id: 2,
        academic_term_id: 3,
      }),
    )
})
test('HU33 generates only authorized kinds and fixes the exam/materia/period of the query', async () => {
  const api = setup()
  assert.deepEqual(await api.getExamReport(exam, filters), report())
  assert.equal(api.calls[0][0], '/exams/4/reports/ENROLLED')
  assert.equal(api.calls[0][1].params.subject_id, 2)
  assert.equal(api.calls[0][1].params.academic_term_id, 3)
  await assert.rejects(
    api.getExamReport(
      { ...exam, permissions: { ...exam.permissions, report_types: [] } },
      filters,
    ),
    (e) => e.status === 422,
  )
  for (const patch of [
    { date_from: '2026-02-30' },
    { date_from: '2026-11-04', date_to: '2026-11-03' },
    { type: 'OFFLINE' },
  ])
    await assert.rejects(
      api.getExamReport(exam, { ...filters, ...patch }),
      (e) => e.status === 422,
    )
})
test('HU33 checks all report kinds: roster, official QR/manual, pending/absent, wrong-exam events, infractions and expulsions', async () => {
  for (const [type, rows] of [
    ['ENROLLED', [row]],
    [
      'ATTENDANCE',
      [
        entry,
        {
          ...entry,
          source_id: 10,
          student: { ...entry.student, id: 8 },
          method: 'MANUAL',
        },
      ],
    ],
    ['PENDING_ABSENT', [pending]],
    ['INCIDENTS', [incident]],
    ['DISCIPLINARY', [infraction, expulsion]],
  ])
    assert.equal(
      (
        await setup(report(type, rows)).getExamReport(exam, {
          ...filters,
          type,
        })
      ).data.length,
      rows.length,
    )
  const absent = { ...pending, record_type: 'ABSENT', state: 'ABSENT' }
  assert.equal(
    (
      await setup(
        report('PENDING_ABSENT', [absent], {
          pending_classification: 'ABSENT',
        }),
      ).getExamReport(exam, { ...filters, type: 'PENDING_ABSENT' })
    ).data[0].state,
    'ABSENT',
  )
})
test('HU33 does not accept unconfirmed offline attendance, mismatched records, missing metadata or fake dates', async () => {
  const value = report()
  for (const patch of [
    { exam: { ...exam, id: 99 } },
    { report: { ...value.report, offline_pending_included: true } },
    { report: { ...value.report, source: 'LOCAL' } },
    { report: { ...value.report, generated_at: '2026-11-03' } },
    { report: { ...value.report, total_records: 2 } },
    { data: [{ ...row, exam_id: 99 }] },
    { data: [{ ...row, student: null }] },
  ])
    await assert.rejects(
      setup({ ...value, ...patch }).getExamReport(exam, filters),
    )
  for (const patch of [
    { state: 'PENDING_SYNC' },
    { method: 'OFFLINE' },
    { occurred_at: null },
    { recorded_by: null },
  ])
    await assert.rejects(
      setup(report('ATTENDANCE', [{ ...entry, ...patch }])).getExamReport(
        exam,
        { ...filters, type: 'ATTENDANCE' },
      ),
    )
})
test('HU33 date filters use Bolivia event dates; roster filters use exam date', async () => {
  const f = {
    type: 'ATTENDANCE',
    date_from: '2026-11-03',
    date_to: '2026-11-03',
  }
  const value = report(
    'ATTENDANCE',
    [{ ...entry, occurred_at: '2026-11-04T02:00:00Z' }],
    {
      filters: {
        ...report().report.filters,
        date_from: f.date_from,
        date_to: f.date_to,
      },
    },
  )
  assert.equal((await setup(value).getExamReport(exam, f)).data.length, 1)
  await assert.rejects(
    setup({
      ...value,
      data: [{ ...entry, occurred_at: '2026-11-04T05:00:00Z' }],
    }).getExamReport(exam, f),
  )
  const roster = report('ENROLLED', [row], {
    filters: {
      ...report().report.filters,
      date_from: '2026-11-04',
      date_to: null,
    },
  })
  await assert.rejects(
    setup(roster).getExamReport(exam, { ...filters, date_from: '2026-11-04' }),
  )
})
test('HU33 cancellation never becomes absence and legitimate empty reports retain scope', async () => {
  const empty = report('PENDING_ABSENT', [], {
    pending_classification: 'NOT_APPLICABLE',
  })
  empty.exam = { ...exam, status: 'CANCELLED' }
  assert.equal(
    (
      await setup(empty).getExamReport(exam, {
        ...filters,
        type: 'PENDING_ABSENT',
      })
    ).data.length,
    0,
  )
  await assert.rejects(
    setup({
      ...empty,
      report: { ...empty.report, pending_classification: 'ABSENT' },
    }).getExamReport(exam, { ...filters, type: 'PENDING_ABSENT' }),
  )
  assert.equal(
    (await setup(report('ENROLLED', [])).getExamReport(exam, filters)).report
      .total_records,
    0,
  )
})
test('HU33 paginated results keep a frozen snapshot and generation metadata; object-key ordering is irrelevant', async () => {
  const original = report()
  const value = report()
  value.report.filters = {
    date_to: null,
    date_from: null,
    academic_term_id: 3,
    subject_id: 2,
    exam_id: 4,
  }
  assert.ok(await setup(value).getExamReport(exam, filters, 1, original.report))
  for (const patch of [
    { id: 'different' },
    { generated_at: '2026-11-03T14:01:00Z' },
    { total_participants: 2 },
  ])
    await assert.rejects(
      setup(report('ENROLLED', [row], patch)).getExamReport(
        exam,
        filters,
        1,
        original.report,
      ),
    )
  await assert.rejects(
    setup().getExamReport(exam, filters, 1, {
      ...original.report,
      filters: { ...original.report.filters, exam_id: 99 },
    }),
    (e) => e.status === 422,
  )
})
test('HU33 exports server snapshots, never the visible page; checks MIME, PDF signature and report headers', async () => {
  const original = report()
  for (const format of ['pdf', 'csv']) {
    const blob = new Blob(
      [format === 'pdf' ? '%PDF-1.4 test' : 'SIS,Nombre\n00123,Ana'],
      { type: format === 'pdf' ? 'application/pdf' : 'text/csv' },
    )
    const api = setup({
      data: blob,
      headers: {
        'x-report-id': original.report.id,
        'x-report-generated-at': original.report.generated_at,
      },
    })
    assert.equal(
      await api.exportExamReport(exam, filters, original, format),
      blob,
    )
    assert.deepEqual(api.calls[0][1].params, {
      report_id: 'snapshot-1',
      format,
    })
  }
  for (const response of [
    { data: new Blob(['oops'], { type: 'application/json' }), headers: {} },
    {
      data: new Blob(['bad'], { type: 'application/pdf' }),
      headers: {
        'x-report-id': 'snapshot-1',
        'x-report-generated-at': original.report.generated_at,
      },
    },
    {
      data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
      headers: {
        'x-report-id': 'other',
        'x-report-generated-at': original.report.generated_at,
      },
    },
  ])
    await assert.rejects(
      setup(response).exportExamReport(exam, filters, original, 'pdf'),
    )
  await assert.rejects(
    setup().exportExamReport(
      exam,
      filters,
      { ...original, report: { ...original.report, formats: [] } },
      'csv',
    ),
    (e) => e.status === 403,
  )
})
test('HU33 denied, expired and pending endpoints stay errors instead of empty successful reports', async () => {
  for (const status of [401, 403, 404, 410, 422, 501, 503]) {
    const e = Object.assign(new Error('HTTP'), {
      isAxiosError: true,
      response: { status },
    })
    await assert.rejects(
      setup(e).getExamReport(exam, filters),
      (e) => e.status === status,
    )
  }
})
