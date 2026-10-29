import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { compile, nodes, settle } from '../../../shared/tests/sourceHarness.mjs'

const require = createRequire(import.meta.url)
const source = compile(readFileSync(new URL('./OfferingEntityPicker.tsx', import.meta.url), 'utf8'))
const tomas = { id: 2, label: 'Tomas Demo Docente', detail: 'DOC-02' }
const irene = { id: 1, label: 'Irene Demo Docente', detail: 'DOC-01' }

function setup({ multiple = false, initialSelected = [], disabled = false } = {}) {
  const slots = []
  const timers = new Set()
  const requests = []
  let cursor = 0, effect, dependencies, cleanup, selected = initialSelected, tree
  const hooks = {
    useId: () => 'picker',
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = initial
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useEffect(callback, next) {
      if (!dependencies || next.some((value, index) => value !== dependencies[index])) {
        effect = callback
        dependencies = next
      }
    },
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'window', source)(
    name => name === 'react' ? hooks : name.endsWith('.css') ? { default: {} } : require(name),
    module, module.exports,
    { setTimeout: callback => { timers.add(callback); return callback }, clearTimeout: callback => timers.delete(callback) },
  )
  const load = (page, search, signal) => new Promise(resolve => requests.push({ page, search, signal, resolve }))
  const render = () => {
    cursor = 0
    tree = module.exports.OfferingEntityPicker({ title: multiple ? 'Materias' : 'Docente', multiple, selected, onChange: values => { selected = values }, load, disabled })
    if (effect) { cleanup?.(); cleanup = effect(); effect = null }
    return tree
  }
  const runTimers = () => { for (const callback of [...timers]) { timers.delete(callback); callback() } }
  render()
  return {
    requests, render, runTimers,
    search(value) { nodes(tree, node => node.type === 'input' && node.props.type === 'search')[0].props.onChange({ target: { value } }); render() },
    choices() { return nodes(tree, node => node.type === 'input' && ['radio', 'checkbox'].includes(node.props.type)) },
    tree: () => tree,
    selected: () => selected,
    close: () => cleanup?.(),
  }
}

test('picker exposes single-choice results directly and selecting a teacher updates the value', async () => {
  const t = setup()
  t.runTimers(); t.requests[0].resolve({ items: [irene, tomas], lastPage: 1 })
  await settle(); t.render()
  assert.equal(nodes(t.tree(), node => node.type === 'select').length, 0)
  assert.equal(t.choices().length, 2)
  assert.equal(t.choices()[1].props.type, 'radio')
  t.choices()[1].props.onChange(); t.render()
  assert.deepEqual(t.selected(), [tomas])
  assert.equal(t.choices()[1].props.checked, true)
  t.close()
})

test('picker cancels stale searches so late results cannot replace the current teacher search', async () => {
  const t = setup()
  t.runTimers()
  t.search('tomas'); t.runTimers()
  assert.equal(t.requests[0].signal.aborted, true)
  assert.equal(t.requests[1].search, 'tomas')
  t.requests[1].resolve({ items: [tomas], lastPage: 1 })
  await settle(); t.render()
  t.requests[0].resolve({ items: [irene], lastPage: 1 })
  await settle(); t.render()
  t.choices()[0].props.onChange()
  assert.deepEqual(t.selected(), [tomas])
  t.close()
})

test('picker preserves multiple subject selection with checkboxes', async () => {
  const t = setup({ multiple: true })
  t.runTimers(); t.requests[0].resolve({ items: [irene, tomas], lastPage: 1 })
  await settle(); t.render()
  t.choices()[0].props.onChange(); t.render()
  t.choices()[1].props.onChange(); t.render()
  assert.equal(t.choices()[0].props.type, 'checkbox')
  assert.deepEqual(t.selected(), [irene, tomas])
  t.choices()[0].props.onChange()
  assert.deepEqual(t.selected(), [tomas])
  t.close()
})

test('picker keeps the existing edit selection visible when searching for a replacement', async () => {
  const t = setup({ initialSelected: [irene] })
  t.search('tomas'); t.runTimers()
  t.requests[0].resolve({ items: [tomas], lastPage: 1 })
  await settle(); t.render()
  assert.equal(nodes(t.tree(), node => node.props?.['aria-label'] === 'Quitar Irene Demo Docente').length, 1)
  assert.deepEqual(t.selected(), [irene])
  t.choices()[0].props.onChange()
  assert.deepEqual(t.selected(), [tomas])
  t.close()
})

test('picker leaves all edit controls inside a disabled fieldset when the assignment is locked', () => {
  const t = setup({ initialSelected: [irene], disabled: true })
  assert.equal(t.tree().type, 'fieldset')
  assert.equal(t.tree().props.disabled, true)
  t.close()
})
