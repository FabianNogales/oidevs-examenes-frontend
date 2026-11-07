import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const incident = {
  id: 9,
  exam_id: 4,
  type: 'IDENTIFICATION',
  description: 'Documento ilegible.',
  origin: 'MANUAL',
  status: 'REPORTED',
  student: {
    id: 7,
    first_names: 'Ana',
    last_names: 'Prueba',
    sis_code: '00123',
    identity_number: '00099',
  },
  reported_by: { id: 2, name: 'Docente responsable' },
  created_at: '2026-11-03T02:00:00Z',
}
const query = {
  page: 1,
  search: '',
  type: '',
  status: '',
  date_from: '',
  date_to: '',
}
const page = {
  exam: { id: 4, name: 'Parcial', subject_name: 'Redes' },
  permissions: { can_create: true, can_export: false },
  data: [incident],
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
  summary: {
    total: 1,
    by_type: {
      IDENTIFICATION: 1,
      SUSPECTED_IMPERSONATION: 0,
      INELIGIBILITY: 0,
      WRONG_EXAM: 0,
      ENVIRONMENT: 0,
    },
  },
  filters: { statuses: [{ value: 'REPORTED', label: 'Reportada' }] },
}
function setup(handler = async () => ({ data: page })) {
  const calls = []
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        get: (...args) => {
          calls.push(args)
          return handler(...args)
        },
      },
    },
  })
  return {
    calls,
    h,
    ...h.load('features/incidents/api/incidentConsultationApi.ts'),
  }
}

test('HU29 reuses the HU27 endpoint and sends only whitelisted query parameters', async () => {
  const api = setup()
  const controller = new AbortController()
  const result = await api.getIncidentConsultation(
    4,
    {
      ...query,
      search: '  00123  ',
      type: 'IDENTIFICATION',
      status: 'REPORTED',
      date_from: '2026-11-02',
      date_to: '2026-11-02',
      can_export: true,
      exam_id: 99,
    },
    controller.signal,
  )
  assert.equal(result.permissions.can_export, false)
  assert.deepEqual(api.calls, [
    [
      '/exams/4/incidents',
      {
        params: {
          page: 1,
          per_page: 10,
          search: '00123',
          type: 'IDENTIFICATION',
          status: 'REPORTED',
          date_from: '2026-11-02',
          date_to: '2026-11-02',
        },
        signal: controller.signal,
      },
    ],
  ])
})

test('HU29 search keeps leading zeros, names, CI and incident identifiers as text', async () => {
  for (const search of ['00123', '00099', 'Ana Prueba', '#9']) {
    const api = setup()
    await api.getIncidentConsultation(4, { ...query, search })
    assert.equal(api.calls[0][1].params.search, search)
  }
})

test('HU29 invalid calendar dates, reversed ranges, types and pages never issue HTTP', async () => {
  const api = setup()
  for (const patch of [
    { date_from: '2026-02-30' },
    { date_to: '2026-13-01' },
    { date_from: '2026-11-04', date_to: '2026-11-02' },
    { type: 'INVENTED' },
    { page: 0 },
    { page: 1.5 },
    { search: 123 },
    { status: null },
  ])
    await assert.rejects(
      api.getIncidentConsultation(4, { ...query, ...patch }),
      { name: 'IncidentConsultationApiError' },
    )
  assert.equal(api.calls.length, 0)
  await api.getIncidentConsultation(4, { ...query, date_from: '2024-02-29' })
  assert.equal(api.calls.length, 1)
})

test('HU29 counters describe the complete filtered result rather than the visible page', async () => {
  const result = {
    ...page,
    meta: { ...page.meta, total: 11, last_page: 2, current_page: 2 },
    summary: {
      total: 11,
      by_type: { ...page.summary.by_type, IDENTIFICATION: 11 },
    },
  }
  const api = setup(async () => ({ data: result }))
  assert.equal(
    (await api.getIncidentConsultation(4, { ...query, page: 2 })).summary.total,
    11,
  )
  assert.equal(api.calls[0][1].params.page, 2)
})

test('HU29 rejects fabricated or incomplete counts, duplicate states and missing export permission', async () => {
  for (const patch of [
    { summary: undefined },
    { permissions: { can_create: true } },
    { summary: { ...page.summary, total: 8 } },
    {
      summary: {
        total: 1,
        by_type: { ...page.summary.by_type, IDENTIFICATION: -1 },
      },
    },
    {
      filters: {
        statuses: [page.filters.statuses[0], page.filters.statuses[0]],
      },
    },
    { filters: { statuses: [{ value: 'REPORTED', label: '' }] } },
  ])
    await assert.rejects(
      setup(async () => ({
        data: { ...page, ...patch },
      })).getIncidentConsultation(4, query),
      { name: 'IncidentConsultationApiError' },
    )
})

test('HU29 rejects rows from other exams or rows outside type/status/date filters', async () => {
  for (const patch of [
    { exam_id: 5 },
    { type: 'WRONG_EXAM' },
    { status: 'OTHER' },
    { created_at: '2026-11-03T04:00:00Z' },
  ]) {
    const api = setup(async () => ({
      data: { ...page, data: [{ ...incident, ...patch }] },
    }))
    await assert.rejects(
      api.getIncidentConsultation(4, {
        ...query,
        type: 'IDENTIFICATION',
        status: 'REPORTED',
        date_to: '2026-11-02',
      }),
    )
  }
  // 02:00 UTC belongs to the previous day in Bolivia; 04:00 UTC starts the next day.
  assert.equal(
    (
      await setup().getIncidentConsultation(4, {
        ...query,
        date_from: '2026-11-02',
        date_to: '2026-11-02',
      })
    ).data[0].id,
    9,
  )
})

test('HU29 actual empty results keep all five zero counters and never fabricate rows', async () => {
  const empty = {
    ...page,
    data: [],
    meta: { ...page.meta, total: 0 },
    summary: {
      total: 0,
      by_type: Object.fromEntries(
        Object.keys(page.summary.by_type).map((type) => [type, 0]),
      ),
    },
  }
  const result = await setup(async () => ({
    data: empty,
  })).getIncidentConsultation(4, query)
  assert.deepEqual(result.data, [])
  assert.equal(result.summary.total, 0)
})

test('HU29 authorization/server errors and abort remain failures without fallback data or retries', async () => {
  for (const status of [401, 403, 404, 422, 500]) {
    const api = setup(async () => {
      throw { isAxiosError: true, response: { status } }
    })
    await assert.rejects(api.getIncidentConsultation(4, query), {
      name: 'IncidentApiError',
      status,
    })
    assert.equal(api.calls.length, 1)
  }
  const cancellation = { __CANCEL__: true }
  await assert.rejects(
    setup(async () => {
      throw cancellation
    }).getIncidentConsultation(4, query),
    (error) => error === cancellation,
  )
})

test('HU27 legacy listing remains compatible without HU29 metadata or extra query parameters', async () => {
  const { summary, filters, ...legacy } = page
  const api = setup(async () => ({ data: legacy }))
  const { getIncidents } = api.h.load('features/incidents/api/incidentsApi.ts')
  assert.deepEqual(await getIncidents(4), legacy)
  assert.deepEqual(api.calls[0][1].params, { page: 1, per_page: 10 })
})
