import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'

const query = {
  search: '00123',
  type: 'WRONG_EXAM',
  status: 'REPORTED',
  date_from: '2026-11-01',
  date_to: '2026-11-03',
  page: 2,
}
const catalog = {
  data: [
    { id: 4, name: 'Parcial', subject_name: 'Redes', exam_date: '2026-11-03' },
  ],
  meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 },
}
function api(handler) {
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
  return { h, calls }
}

test('HU29 admin catalog uses authenticated search/pagination and rejects duplicate or incomplete results', async () => {
  const ui = api(async () => ({ data: catalog }))
  const { getIncidentExamCatalog } = ui.h.load(
    'features/incidents/api/incidentExamCatalogApi.ts',
  )
  const controller = new AbortController()
  assert.deepEqual(
    await getIncidentExamCatalog(' Redes ', 1, controller.signal),
    catalog,
  )
  assert.deepEqual(ui.calls[0], [
    '/admin/incidents/exams',
    {
      params: { search: 'Redes', page: 1, per_page: 10 },
      signal: controller.signal,
    },
  ])
  for (const response of [
    { ...catalog, data: [catalog.data[0], catalog.data[0]] },
    { ...catalog, meta: { ...catalog.meta, total: -1 } },
    { ...catalog, data: [{ ...catalog.data[0], name: '' }] },
  ]) {
    const invalid = api(async () => ({ data: response }))
    await assert.rejects(
      invalid.h
        .load('features/incidents/api/incidentExamCatalogApi.ts')
        .getIncidentExamCatalog('', 1),
    )
  }
  await assert.rejects(getIncidentExamCatalog('', 0))
  assert.equal(ui.calls.length, 1)
})

test('HU29 catalog errors remain errors, not empty lists or fallback access', async () => {
  for (const status of [401, 403, 404, 500]) {
    const ui = api(async () => {
      throw { isAxiosError: true, response: { status } }
    })
    await assert.rejects(
      ui.h
        .load('features/incidents/api/incidentExamCatalogApi.ts')
        .getIncidentExamCatalog('', 1),
      { name: 'IncidentApiError', status },
    )
    assert.equal(ui.calls.length, 1)
  }
})

test('HU29 exports the complete server-filtered scope, never a paginated client copy', async () => {
  const blob = new Blob(['id,descripcion\n9,Prueba\n'], {
    type: 'text/csv;charset=utf-8',
  })
  const ui = api(async () => ({ data: blob }))
  const { exportIncidentReport } = ui.h.load(
    'features/incidents/api/incidentExportApi.ts',
  )
  assert.equal(await exportIncidentReport(4, query, 'csv'), blob)
  assert.deepEqual(ui.calls[0], [
    '/exams/4/incidents/export',
    {
      params: {
        search: '00123',
        type: 'WRONG_EXAM',
        status: 'REPORTED',
        date_from: '2026-11-01',
        date_to: '2026-11-03',
        format: 'csv',
      },
      responseType: 'blob',
      signal: undefined,
    },
  ])
  assert.equal('page' in ui.calls[0][1].params, false)
  assert.equal('per_page' in ui.calls[0][1].params, false)
})

test('HU29 export refuses empty, HTML/JSON and fake PDF files instead of downloading an error as a report', async () => {
  for (const [format, blob] of [
    ['csv', new Blob([], { type: 'text/csv' })],
    ['csv', new Blob(['{"message":"denied"}'], { type: 'application/json' })],
    ['pdf', new Blob(['<html>Error</html>'], { type: 'text/html' })],
    ['pdf', new Blob(['Not a PDF'], { type: 'application/pdf' })],
  ]) {
    const ui = api(async () => ({ data: blob }))
    await assert.rejects(
      ui.h
        .load('features/incidents/api/incidentExportApi.ts')
        .exportIncidentReport(4, query, format),
      /reporte válido/,
    )
    assert.equal(ui.calls.length, 1)
  }
  const pdf = new Blob(['%PDF-1.7\nfixture'], { type: 'application/pdf' })
  const ui = api(async () => ({ data: pdf }))
  assert.equal(
    await ui.h
      .load('features/incidents/api/incidentExportApi.ts')
      .exportIncidentReport(4, query, 'pdf'),
    pdf,
  )
})

test('HU29 export authorization is rechecked by API and failed downloads never become a file', async () => {
  for (const status of [401, 403, 404, 422, 500, 501]) {
    const ui = api(async () => {
      throw { isAxiosError: true, response: { status } }
    })
    await assert.rejects(
      ui.h
        .load('features/incidents/api/incidentExportApi.ts')
        .exportIncidentReport(4, query, 'csv'),
      { status },
    )
    assert.equal(ui.calls.length, 1)
  }
  const ui = api(async () => {
    throw Error('Unexpected request')
  })
  await assert.rejects(
    ui.h
      .load('features/incidents/api/incidentExportApi.ts')
      .exportIncidentReport(0, query, 'csv'),
  )
  assert.equal(ui.calls.length, 0)
})

test('HU29 repeated export click is serialized; unmount aborts and prevents a stale download', async () => {
  let finish
  const downloads = [],
    calls = []
  const h = sourceHarness({
    '../api/incidentExportApi': {
      exportIncidentReport: (...args) => {
        calls.push(args)
        return new Promise((resolve) => {
          finish = resolve
        })
      },
    },
    '@/shared/utils/downloadBlob': {
      downloadBlob: (...args) => downloads.push(args),
    },
    '@/shared/api/httpClient': { httpClient: {} },
  })
  const { IncidentExportActions } = h.load(
    'features/incidents/components/IncidentExportActions.tsx',
  )
  let tree = h.render(() => IncidentExportActions({ examId: 4, query }))
  const buttons = nodes(tree, (n) => n.type === 'button')
  buttons[0].props.onClick()
  buttons[1].props.onClick()
  assert.equal(calls.length, 1)
  tree = h.render()
  assert.equal(nodes(tree, (n) => n.type === 'button')[0].props.disabled, true)
  h.unmount()
  assert.equal(calls[0][3].aborted, true)
  finish(new Blob(['id\n9'], { type: 'text/csv' }))
  await settle()
  assert.deepEqual(downloads, [])
})

test('HU29 admin selector opens only the selected scope and clears filters from the previous exam', () => {
  let search = ''
  const h = sourceHarness({
    'react-router': {
      useSearchParams: () => [
        new URLSearchParams(search),
        (next) => {
          search = next.toString()
        },
      ],
    },
    '../pages/ExamIncidentConsultation': {
      ExamIncidentConsultation: 'consultation',
    },
    './ExamIncidentConsultation': { ExamIncidentConsultation: 'consultation' },
    '../components/IncidentExamPicker': { IncidentExamPicker: 'picker' },
    '@/shared/components/Breadcrumbs/Breadcrumbs': {
      Breadcrumbs: 'breadcrumbs',
    },
  })
  const { AdminIncidentsPage } = h.load(
    'features/incidents/pages/AdminIncidentsPage.tsx',
  )
  let tree = h.render(AdminIncidentsPage)
  assert.equal(nodes(tree, (n) => n.type === 'consultation').length, 0)
  nodes(tree, (n) => n.type === 'picker')[0].props.onSelect(4)
  tree = h.render()
  assert.equal(tree.type, 'consultation')
  assert.equal(tree.props.examId, 4)
  assert.equal(tree.props.mode, 'admin')
  search += '&search=00123&page=3'
  tree = h.render()
  tree.props.renderExamPicker().props.onSelect(5)
  assert.equal(search, 'from=admin&exam_id=5')
  search = 'exam_id=invalid'
  tree = h.render()
  assert.equal(nodes(tree, (n) => n.type === 'consultation').length, 0)
  assert.match(textContent(tree), /identificador del examen no es válido/)
  h.unmount()
})

test('HU29 admin detail navigation preserves selected exam/filters without accepting an external return URL', () => {
  const h = sourceHarness()
  const { incidentConsultationListPath } = h.load(
    'features/incidents/utils/incidentConsultationNavigation.ts',
  )
  const path = incidentConsultationListPath(
    4,
    new URLSearchParams(
      'from=admin&exam_id=999&search=00123&page=2&returnTo=https://evil.test',
    ),
  )
  assert.equal(
    path,
    '/admin/incidents?from=admin&exam_id=4&search=00123&page=2',
  )
})

test('HU29 Incidencias navigation is administrative and does not appear for other roles', () => {
  const h = sourceHarness()
  const { getHeaderNavigation } = h.load(
    'shared/components/Header/headerNavigation.config.ts',
  )
  const links = (role) =>
    getHeaderNavigation(role).flatMap((item) => [
      item.to,
      ...(item.children ?? []).map((child) => child.to),
    ])
  assert.ok(links('admin').includes('/admin/incidents'))
  for (const role of ['teacher', 'student', undefined])
    assert.equal(links(role).includes('/admin/incidents'), false)
})
