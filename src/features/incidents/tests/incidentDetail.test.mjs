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
  type: 'SUSPECTED_IMPERSONATION',
  description: 'Posible discrepancia.\nRequiere revisión.',
  origin: 'MANUAL',
  status: 'REPORTED',
  student: null,
  reported_by: { id: 2, name: 'Docente' },
  created_at: '2026-11-02T14:00:00Z',
}
function setup(
  handler = async () => ({ data: { data: incident } }),
  params = { examId: '4', incidentId: '9' },
) {
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
    'react-router': {
      Link: 'link',
      useParams: () => params,
      useSearchParams: () => [new URLSearchParams('from=teacher')],
      useLocation: () => ({ state: { createdIncidentId: 9 } }),
    },
    '@/shared/components/Breadcrumbs/Breadcrumbs': {
      Breadcrumbs: 'breadcrumbs',
    },
  })
  return { h, calls }
}

test('HU27 detail preserves multiline evidence and identifies reported suspicions without sanctions', () => {
  const { h } = setup()
  const { IncidentDetails } = h.load(
    'features/incidents/components/IncidentDetails.tsx',
  )
  const tree = h.render(() => IncidentDetails({ incident }))
  const text = textContent(tree)
  for (const value of [
    'Presunta suplantación',
    'Reportada',
    'Sin estudiante identificado',
    'Docente',
    incident.description,
    'No confirma una infracción',
  ])
    assert.ok(text.includes(value), value)
  assert.equal(nodes(tree, (n) => n.type === 'button').length, 0)
  assert.equal(
    nodes(tree, (n) => n.type === 'time')[0].props.dateTime,
    incident.created_at,
  )
  const { formatIncidentDate } = h.load(
    'features/incidents/utils/incidentDisplay.ts',
  )
  assert.match(formatIncidentDate(incident.created_at), /10:00:00/)
  h.unmount()
})

test('HU27 automatic detail keeps student IDs and the actual event actor without claiming the operator manually reported', () => {
  const { h } = setup()
  const { IncidentDetails } = h.load(
    'features/incidents/components/IncidentDetails.tsx',
  )
  const data = {
    ...incident,
    type: 'WRONG_EXAM',
    origin: 'AUTOMATIC',
    student: {
      id: 7,
      first_names: 'Ana',
      last_names: 'Prueba',
      sis_code: '00123',
      identity_number: '0099',
    },
  }
  const tree = h.render(() => IncidentDetails({ incident: data }))
  for (const value of [
    'Automática',
    '00123',
    '0099',
    'Responsable asociado al evento',
    'no crea otro reporte',
  ])
    assert.ok(textContent(tree).includes(value))
  assert.doesNotMatch(textContent(tree), /Reportado por/)
  h.unmount()
})

test('HU27 detail hides evidence on authorization/not-found/server failure and supports retry', async () => {
  for (const status of [403, 404, 500]) {
    let failed = true
    const { h } = setup(async () => {
      if (failed) throw { isAxiosError: true, response: { status } }
      return { data: { data: incident } }
    })
    const { IncidentDetailPage } = h.load(
      'features/incidents/pages/IncidentDetailPage.tsx',
    )
    const page = IncidentDetailPage()
    h.render(() => page.type(page.props))
    await settle()
    let tree = h.render()
    assert.equal(nodes(tree, (n) => n.props?.role === 'alert').length, 1)
    assert.equal(
      nodes(tree, (n) => n.type?.name === 'IncidentDetails').length,
      0,
    )
    assert.doesNotMatch(
      textContent(tree),
      /Incidencia registrada correctamente/,
    )
    failed = false
    nodes(tree, (n) => n.type === 'button')[0].props.onClick()
    h.render()
    await settle()
    tree = h.render()
    assert.equal(
      nodes(tree, (n) => n.type?.name === 'IncidentDetails')[0].props.incident
        .id,
      9,
    )
    assert.match(textContent(tree), /Incidencia registrada correctamente/)
    assert.equal(
      nodes(tree, (n) => n.type === 'link')[0].props.to,
      '/exams/4/incidents?from=teacher',
    )
    h.unmount()
  }
})

test('HU27 invalid IDs never render a data loader', () => {
  for (const params of [
    { examId: '0', incidentId: '9' },
    { examId: '4', incidentId: 'abc' },
  ]) {
    const { h, calls } = setup(undefined, params)
    const { IncidentDetailPage } = h.load(
      'features/incidents/pages/IncidentDetailPage.tsx',
    )
    assert.match(textContent(IncidentDetailPage()), /no es válido/)
    assert.equal(calls.length, 0)
  }
})

test('HU27 changing selected incident aborts the old GET and never shows its late evidence', async () => {
  const pending = [],
    signals = []
  const { h } = setup((_url, config) => {
    signals.push(config.signal)
    return new Promise((resolve) => pending.push(resolve))
  })
  const { useIncidentDetail } = h.load(
    'features/incidents/hooks/useIncidentDetail.ts',
  )
  let id = 9
  h.render(() => useIncidentDetail(4, id))
  id = 10
  h.render()
  assert.equal(signals[0].aborted, true)
  pending[0]({ data: { data: incident } })
  await settle()
  assert.equal(h.render().incident, null)
  pending[1]({ data: { data: { ...incident, id: 10 } } })
  await settle()
  assert.equal(h.render().incident.id, 10)
  h.unmount()
})
