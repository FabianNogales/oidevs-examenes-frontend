import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'
export { nodes, textContent, settle }
const { AxiosError } = createRequire(import.meta.url)('axios')
export const httpError = (status, data = {}) =>
  new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
  })
export const page = (data, current = 1, last = 1, total = data.length) => ({
  data,
  meta: { current_page: current, last_page: last, total, per_page: 15 },
})
export function client(handlers = {}, overrides = {}) {
  const calls = []
  const httpClient = Object.fromEntries(
    ['get', 'post', 'patch', 'delete'].map((method) => [
      method,
      async (...args) => {
        calls.push({ method, args })
        assert.ok(handlers[method], `Unexpected ${method}: ${args[0]}`)
        return handlers[method](...args)
      },
    ]),
  )
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient },
    'react-router': {
      Link: 'link',
      useParams: () => ({}),
      useNavigate: () => () => {},
    },
    ...overrides,
  })
  return { h, calls }
}
export function component(c, path, name, props = {}) {
  const Component = c.h.load(path)[name]
  let tree
  const ui = {
    ...c,
    props,
    get tree() {
      return tree
    },
    render() {
      function expand(node) {
        if (Array.isArray(node)) return node.map(expand)
        if (!node || typeof node !== 'object' || !node.props) return node
        const pure = [
          'EditorFeedback',
          'PortalField',
          'PortalPageLayout',
          'PortalFeedback',
          'PortalPager',
          'InformationContent',
          'ContentLink',
          'ServiceCard',
        ].includes(node.type?.name)
        return {
          ...node,
          props: {
            ...node.props,
            children: expand(
              pure ? node.type(node.props) : node.props.children,
            ),
          },
        }
      }
      tree = expand(c.h.render(() => Component(props)))
      return tree
    },
    async ready() {
      await settle()
      ui.render()
      return tree
    },
    field: (name) => nodes(tree, (node) => node.props?.name === name)[0],
    button: (label) =>
      nodes(
        tree,
        (node) => node.type === 'button' && textContent(node).trim() === label,
      )[0],
    async click(label) {
      const button = ui.button(label)
      assert.ok(button, label)
      assert.ok(!button.props.disabled, label)
      button.props.onClick()
      ui.render()
      await ui.ready()
    },
    edit(name, value) {
      ui.field(name).props.onChange({ target: { value, checked: value } })
      ui.render()
    },
    async submit() {
      nodes(tree, (node) => node.type === 'form')[0].props.onSubmit({
        preventDefault() {},
      })
      ui.render()
      await ui.ready()
    },
  }
  ui.render()
  return ui
}
