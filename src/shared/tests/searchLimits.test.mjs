import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes } from './sourceHarness.mjs'

for (const [limit, maxLength] of [[80, undefined], [50, 50]]) {
  test(`search caps initial text, edits and submitted queries at ${limit} characters`, () => {
    const h = sourceHarness()
    const { SearchBar } = h.load('shared/components/ui/SearchBar/SearchBar.tsx')
    const submitted = []
    const props = { maxLength, defaultValue: 'a'.repeat(120), onSubmit: (value) => submitted.push(value) }
    let tree
    const render = () => { tree = h.render(() => SearchBar(props)) }
    render()
    let input = nodes(tree, (node) => node.type === 'input')[0]
    assert.equal(input.props.maxLength, limit)
    assert.equal(input.props.value.length, limit)
    input.props.onChange({ currentTarget: { value: 'b'.repeat(120) } })
    render()
    input = nodes(tree, (node) => node.type === 'input')[0]
    assert.equal(input.props.value, 'b'.repeat(limit))
    nodes(tree, (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} })
    assert.deepEqual(submitted, ['b'.repeat(limit)])
    h.unmount()
  })
}
