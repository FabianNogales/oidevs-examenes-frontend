import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nodes, sourceHarness, textContent } from './sourceHarness.mjs'

// D7 (real backend): pressing "Reintentar" unmounts the error state while the request is pending, so focus fell
// to <body> and keyboard users lost their place when the retry failed again (rules.md §6, WCAG 2.4.3).

const retryButton = (tree) => nodes(tree, (n) => n.type === 'button' && textContent(n).trim() === 'Reintentar')[0]
// Attaches a focusable fake element to the retry button's ref before effects run, as React would.
const attachRetry = (h, target) => (tree) => {
  const button = retryButton(tree)
  if (button?.props.ref) button.props.ref.current = target
}

test('useRetryFocus refocuses only after a failed retry and only when focus was lost', () => {
  const scenarios = [
    { name: 'retry fails again', retry: true, outcome: 'error', otherFocus: false, focused: true },
    { name: 'retry succeeds', retry: true, outcome: 'ok', otherFocus: false, focused: false },
    { name: 'user moved focus meanwhile', retry: true, outcome: 'error', otherFocus: true, focused: false },
    { name: 'error without a retry', retry: false, outcome: 'error', otherFocus: false, focused: false },
  ]
  for (const s of scenarios) {
    const h = sourceHarness()
    const { useRetryFocus } = h.load('shared/hooks/useRetryFocus.ts')
    const button = new h.Element({ tag: 'button' })
    let hook
    const step = (loading, failed) => h.render(() => (hook = useRetryFocus(loading, failed)), () => { hook.retryRef.current = button })
    step(false, true)
    if (s.retry) hook.markRetry()
    step(true, true)
    if (s.otherFocus) new h.Element({ tag: 'input' }).focus()
    step(false, s.outcome === 'error')
    assert.equal(h.document.activeElement === button, s.focused, s.name)
    h.unmount()
  }
})

test('DataTable, DataCardGrid and IncidentExamPicker return focus to Reintentar after a failed retry', () => {
  const cases = [
    ['shared/components/DataTable/DataTable.tsx', 'DataTable', (loading, error, onRetry) => ({ columns: [], data: [], loading, error, onRetry })],
    ['shared/components/DataCardGrid/DataCardGrid.tsx', 'DataCardGrid', (loading, error, onRetry) => ({ fields: [], data: [], loading, error, onRetry })],
  ]
  for (const [file, name, props] of cases) {
    const h = sourceHarness({ './useRouteAccessContext': { useRouteAccessContext: () => ({}) } })
    const Component = h.load(file)[name]
    const button = new h.Element({ tag: 'button' })
    let retries = 0
    const render = (loading, error) => h.render(() => Component(props(loading, error, () => { retries++ })), attachRetry(h, button))
    const failed = render(false, 'El reporte o su catálogo aún no está disponible.')
    retryButton(failed).props.onClick()
    assert.equal(retries, 1, `${name}: onRetry still called once`)
    assert.equal(retryButton(render(true, null)), undefined, `${name}: error state hidden while loading`)
    render(false, 'El reporte o su catálogo aún no está disponible.')
    assert.equal(h.document.activeElement, button, `${name}: focus back on Reintentar`)
    h.unmount()
  }

  let state = { loading: false, error: 'No se pudo consultar el catálogo de exámenes.' }
  let retries = 0
  const h = sourceHarness({
    '../hooks/useIncidentExamCatalog': { useIncidentExamCatalog: () => ({ ...state, query: '', setQuery() {}, response: null, retry: () => { retries++ } }) },
  })
  const { IncidentExamPicker } = h.load('features/incidents/components/IncidentExamPicker.tsx')
  const button = new h.Element({ tag: 'button' })
  const render = () => h.render(() => IncidentExamPicker({ selectedId: null, onSelect() {} }), attachRetry(h, button))
  retryButton(render()).props.onClick()
  assert.equal(retries, 1)
  state = { loading: true, error: null }
  assert.equal(retryButton(render()), undefined)
  state = { loading: false, error: 'No se pudo consultar el catálogo de exámenes.' }
  render()
  assert.equal(h.document.activeElement, button, 'IncidentExamPicker: focus back on Reintentar')
  h.unmount()
})
