import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'

function setup(handler) {
  return sourceHarness({
    '@/shared/api/httpClient': { httpClient: { get: handler } },
    'react-router': {
      Link: 'link',
      NavLink: 'nav-link',
      useParams: () => ({ examId: '4' }),
      useSearchParams: () => [new URLSearchParams('from=teacher')],
    },
    '@/shared/components/DataTable/DataTable': { DataTable: 'data-table' },
    '@/shared/components/Breadcrumbs/Breadcrumbs': {
      Breadcrumbs: 'breadcrumbs',
    },
  })
}
const result = {
  exam: { id: 4, name: 'Parcial', subject_name: 'Redes' },
  permissions: { can_create: true },
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
}

test('HU27 navigation exposes only implemented sections and keeps exam summary filters', () => {
  const h = setup()
  const { ExamIncidentNavigation } = h.load(
    'features/incidents/components/ExamIncidentNavigation.tsx',
  )
  const tree = h.render(() =>
    ExamIncidentNavigation({ examId: 4, search: '?view=cancelled&page=2' }),
  )
  assert.deepEqual(
    nodes(tree, (n) => n.type === 'nav-link').map((n) => n.props.to),
    [
      '/teacher/exams/4?view=cancelled&page=2',
      '/exams/4/incidents?from=teacher',
    ],
  )
  assert.doesNotMatch(textContent(tree), /Reportes|Expulsiones|Asistencia/)
  h.unmount()
})

test('HU27 listing renders actual empty results but not an authorization error as an empty list', async () => {
  for (const denied of [false, true]) {
    const h = setup(async () => {
      if (denied) throw { isAxiosError: true, response: { status: 403 } }
      return { data: result }
    })
    const { ExamIncidentsPage } = h.load(
      'features/incidents/pages/ExamIncidentsPage.tsx',
    )
    const element = ExamIncidentsPage()
    let tree = h.render(() => element.type(element.props))
    assert.equal(
      nodes(tree, (n) => n.type === 'data-table')[0].props.loading,
      true,
    )
    await settle()
    tree = h.render()
    const table = nodes(tree, (n) => n.type === 'data-table')[0]
    assert.equal(table.props.loading, false)
    assert.equal(Boolean(table.props.error), denied)
    assert.equal(
      nodes(tree, (n) => n.type === 'link')[0].props.to,
      '/exams/4/entry-control?from=teacher',
    )
    h.unmount()
  }
})

test('HU27 requests abort on context changes and ignore late responses from another exam', async () => {
  const calls = [],
    pending = []
  const h = setup((_url, config) => {
    calls.push(config)
    return new Promise((resolve) => pending.push(resolve))
  })
  const { useIncidents } = h.load('features/incidents/hooks/useIncidents.ts')
  let examId = 4
  h.render(() => useIncidents(examId))
  examId = 5
  h.render()
  assert.equal(calls[0].signal.aborted, true)
  pending[0]({ data: result })
  await settle()
  assert.equal(h.render().response, null)
  pending[1]({ data: { ...result, exam: { ...result.exam, id: 5 } } })
  await settle()
  assert.equal(h.render().response.exam.id, 5)
  h.unmount()
  assert.equal(calls[1].signal.aborted, true)
})
