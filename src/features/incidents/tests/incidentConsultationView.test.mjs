import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'

const incident = {
  id: 9,
  exam_id: 4,
  type: 'IDENTIFICATION',
  description: 'Documento ilegible.',
  origin: 'AUTOMATIC',
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
const page = {
  exam: { id: 4, name: 'Parcial', subject_name: 'Redes' },
  permissions: { can_create: false, can_export: false },
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
function setup(handler = async () => page) {
  const calls = []
  let search = 'from=teacher',
    examId = 4
  const h = sourceHarness({
    '../api/incidentConsultationApi': {
      getIncidentConsultation: (...args) => {
        calls.push(args)
        return handler(...args)
      },
    },
    '../hooks/useIncidentDetail': {
      useIncidentDetail: () => ({ loading: false, error: null, incident }),
    },
    'react-router': {
      Link: 'link',
      NavLink: 'nav-link',
      useParams: () => ({ examId: String(examId), incidentId: '9' }),
      useLocation: () => ({ state: {} }),
      useSearchParams: () => [
        new URLSearchParams(search),
        (next) => {
          search = next.toString()
        },
      ],
    },
    '@/shared/components/DataTable/DataTable': { DataTable: 'data-table' },
    '@/shared/components/Breadcrumbs/Breadcrumbs': {
      Breadcrumbs: 'breadcrumbs',
    },
  })
  return {
    h,
    calls,
    search: () => search,
    setSearch: (value) => {
      search = value
    },
    setExam: (value) => {
      examId = value
    },
  }
}

test('HU29 hook commits applied filters to the URL, resets pagination, and removes stale records during loading', async () => {
  const ui = setup()
  const { useIncidentConsultation } = ui.h.load(
    'features/incidents/hooks/useIncidentConsultation.ts',
  )
  ui.h.render(() => useIncidentConsultation(4))
  await settle()
  assert.equal(ui.h.render().response.data[0].id, 9)
  ui.h
    .render()
    .apply({
      search: '  00123  ',
      type: '',
      status: 'REPORTED',
      date_from: '',
      date_to: '',
    })
  assert.equal(new URLSearchParams(ui.search()).get('search'), '00123')
  assert.equal(new URLSearchParams(ui.search()).has('page'), false)
  assert.equal(ui.h.render().response, null)
  await settle()
  assert.equal(ui.h.render().response.data[0].id, 9)
  ui.h.render().setPage(2)
  ui.h.render()
  assert.equal(ui.calls.at(-1)[1].page, 2)
  assert.equal(ui.calls.at(-1)[1].search, '00123')
  assert.equal(ui.calls.at(-1)[1].status, 'REPORTED')
  ui.h.unmount()
})

test('HU29 changing filters aborts previous requests and ignores a late response from another exam', async () => {
  const pending = []
  const ui = setup(() => new Promise((resolve) => pending.push(resolve)))
  const { useIncidentConsultation } = ui.h.load(
    'features/incidents/hooks/useIncidentConsultation.ts',
  )
  let examId = 4
  ui.h.render(() => useIncidentConsultation(examId))
  ui.setSearch('from=teacher&search=Ana')
  ui.h.render()
  assert.equal(ui.calls[0][2].aborted, true)
  examId = 5
  ui.h.render()
  assert.equal(ui.calls[1][2].aborted, true)
  pending[0](page)
  pending[1](page)
  await settle()
  assert.equal(ui.h.render().response, null)
  pending[2]({ ...page, exam: { ...page.exam, id: 5 } })
  await settle()
  assert.equal(ui.h.render().response.exam.id, 5)
  ui.h.unmount()
  assert.equal(ui.calls[2][2].aborted, true)
})

test('HU29 filter draft needs Buscar; reversed dates do not apply and clear resets all fields', () => {
  const ui = setup()
  const { IncidentConsultationFilters } = ui.h.load(
    'features/incidents/components/IncidentConsultationFilters.tsx',
  )
  const applied = []
  let tree = ui.h.render(() =>
    IncidentConsultationFilters({
      initial: { search: '', type: '', status: '', date_from: '', date_to: '' },
      statuses: page.filters.statuses,
      onApply: (filters) => applied.push(filters),
    }),
  )
  nodes(
    tree,
    (n) => n.type === 'input' && n.props.name === 'search',
  )[0].props.onChange({ target: { value: '00123' } })
  assert.equal(applied.length, 0)
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  assert.equal(applied[0].search, '00123')
  nodes(tree, (n) => n.props?.name === 'date_from')[0].props.onChange({
    target: { value: '2026-11-05' },
  })
  tree = ui.h.render()
  nodes(tree, (n) => n.props?.name === 'date_to')[0].props.onChange({
    target: { value: '2026-11-02' },
  })
  tree = ui.h.render()
  nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
    preventDefault() {},
  })
  tree = ui.h.render()
  assert.match(textContent(tree), /igual o posterior/)
  assert.equal(applied.length, 1)
  nodes(
    tree,
    (n) => n.type === 'button' && textContent(n) === 'Limpiar filtros',
  )[0].props.onClick()
  assert.deepEqual(applied[1], {
    search: '',
    type: '',
    status: '',
    date_from: '',
    date_to: '',
  })
  ui.h.unmount()
})

test('HU29 teacher view uses server metadata, shared table and scope-safe filtered detail links', async () => {
  const ui = setup()
  ui.setSearch(
    'from=teacher&search=00123&type=IDENTIFICATION&status=REPORTED&page=2',
  )
  const { ExamIncidentConsultation } = ui.h.load(
    'features/incidents/pages/ExamIncidentConsultation.tsx',
  )
  ui.h.render(() => ExamIncidentConsultation({ examId: 4 }))
  await settle()
  const tree = ui.h.render()
  const table = nodes(tree, (n) => n.type?.name === 'IncidentRecordsTable')[0]
  assert.equal(table.props.data[0], incident)
  assert.equal(table.props.filtered, true)
  const path = table.props.detailPath(incident)
  assert.match(path, /^\/exams\/4\/incidents\/9\?/)
  assert.equal(new URLSearchParams(path.split('?')[1]).get('page'), '2')
  assert.equal(
    nodes(tree, (n) => n.type?.name === 'IncidentConsultationSummary')[0].props
      .summary,
    page.summary,
  )
  assert.equal(
    nodes(
      tree,
      (n) => n.type === 'link' && textContent(n) === 'Registrar incidencia',
    ).length,
    0,
  )
  assert.doesNotMatch(textContent(tree), /Imponer sanción|Expulsar estudiante/)
  ui.h.unmount()
})

test('HU29 table keeps report states separate from catalog ACTIVE/INACTIVE and identifies automatic origin', () => {
  const ui = setup()
  const { IncidentRecordsTable } = ui.h.load(
    'features/incidents/components/IncidentRecordsTable.tsx',
  )
  const tree = IncidentRecordsTable({
    data: [incident],
    meta: page.meta,
    loading: false,
    error: null,
    retry() {},
    setPage() {},
    detailPath: (item) => '/detail/' + item.id,
    statuses: page.filters.statuses,
    filtered: true,
  })
  assert.equal(tree.type, 'data-table')
  assert.equal('status' in tree.props.data[0], false)
  assert.equal(
    tree.props.columns.find((c) => c.id === 'origin').cell(tree.props.data[0]),
    'Automático',
  )
  assert.equal(
    tree.props.columns
      .find((c) => c.id === 'incident_status')
      .cell(tree.props.data[0]),
    'Reportada',
  )
  assert.match(tree.props.emptyTitle, /coincidan con los filtros/)
  assert.equal(tree.props.getProfilePath(tree.props.data[0]), '/detail/9')
})

test('HU29 summary displays all server category counts, including zero categories', () => {
  const ui = setup()
  const { IncidentConsultationSummary } = ui.h.load(
    'features/incidents/components/IncidentConsultationSummary.tsx',
  )
  const tree = IncidentConsultationSummary({
    summary: {
      ...page.summary,
      total: 51,
      by_type: { ...page.summary.by_type, IDENTIFICATION: 51 },
    },
  })
  assert.equal(nodes(tree, (n) => n.type === 'dd').length, 5)
  assert.equal(nodes(tree, (n) => n.type === 'dd')[0].props.children, 51)
  assert.match(textContent(tree), /51 incidencias/)
})

test('HU29 detail return links preserve only consultation parameters, never arbitrary destinations', () => {
  const ui = setup()
  ui.setSearch(
    'from=teacher&search=00123&type=IDENTIFICATION&page=2&returnTo=https://evil.test&role=ADMINISTRADOR',
  )
  const { IncidentDetailPage } = ui.h.load(
    'features/incidents/pages/IncidentDetailPage.tsx',
  )
  const element = IncidentDetailPage()
  const tree = ui.h.render(() => element.type(element.props))
  const back = nodes(tree, (n) => n.type === 'link')[0].props.to
  assert.equal(
    back,
    '/exams/4/incidents?from=teacher&search=00123&type=IDENTIFICATION&page=2',
  )
  assert.doesNotMatch(back, /evil|role|returnTo/)
  ui.h.unmount()
})

test('HU29 permission failure clears rows and counters instead of pretending an empty successful query', async () => {
  const ui = setup(async () => {
    throw new Error('Acceso no autorizado.')
  })
  const { ExamIncidentConsultation } = ui.h.load(
    'features/incidents/pages/ExamIncidentConsultation.tsx',
  )
  ui.h.render(() => ExamIncidentConsultation({ examId: 4 }))
  await settle()
  const tree = ui.h.render()
  assert.equal(
    nodes(tree, (n) => n.type?.name === 'IncidentConsultationSummary').length,
    0,
  )
  const table = nodes(tree, (n) => n.type?.name === 'IncidentRecordsTable')[0]
  assert.equal(table.props.error, 'Acceso no autorizado.')
  assert.deepEqual(table.props.data, [])
  ui.h.unmount()
})
