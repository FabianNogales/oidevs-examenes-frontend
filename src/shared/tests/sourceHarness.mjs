import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
export const ts = require('typescript')
export const sourceRoot = fileURLToPath(new URL('../../', import.meta.url))
export const compile = (source) => ts.transpileModule(source, { fileName: 'test.tsx', compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX,
} }).outputText

// Execute actual source with simulated hooks, DOM, clock and HTTP. This is not a browser test.
export function sourceHarness(overrides = {}) {
  let now = 1_800_000_000_000
  let nextTimer = 0
  let cursor = 0
  let renderCallback
  const slots = []
  const effects = []
  const timers = new Map()
  const events = new Map()
  const eventTarget = (prefix) => ({
    addEventListener: (name, listener) => {
      const key = prefix + name
      if (!events.has(key)) events.set(key, new Set())
      events.get(key).add(listener)
    },
    removeEventListener: (name, listener) => events.get(prefix + name)?.delete(listener),
  })
  const style = { overflow: '', getPropertyValue: () => style.overflow, getPropertyPriority: () => '',
    setProperty: (_key, value) => { style.overflow = value }, removeProperty: () => { style.overflow = '' } }
  const document = { ...eventTarget('document:'), visibilityState: 'visible', activeElement: null, body: { style } }
  const window = eventTarget('window:')
  class Element {
    constructor(options = {}) { Object.assign(this, { tabIndex: 0, hidden: false, disabled: false, isConnected: true, children: [] }, options) }
    focus() { document.activeElement = this }
    contains(element) { return this === element || this.children.includes(element) }
    matches() { return this.disabled || this.type === 'hidden' }
    closest() { return this.hidden || this.inert || this.ariaHidden ? this : null }
    getClientRects() { return this.invisible ? [] : [{}] }
    querySelector(selector) { return this.querySelectorAll(selector)[0] }
    querySelectorAll(selector) {
      this.selector = selector
      return this.children.filter((child) => (!child.tag || selector.includes(child.tag)) &&
        (!selector.includes(':not(:disabled)') || !child.disabled))
    }
  }
  const hooks = {
    useState: (initial) => {
      const index = cursor++
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useRef: (initial) => { const index = cursor++; return slots[index] ??= { current: initial } },
    useId: () => `test-id-${cursor++}`,
    useMemo: (callback) => callback(),
    useCallback: (callback, dependencies) => {
      const index = cursor++
      const old = slots[index]
      if (!old || dependencies.some((value, i) => value !== old.dependencies[i])) slots[index] = { dependencies, callback }
      return slots[index].callback
    },
    useEffect: (callback, dependencies) => {
      const index = cursor++
      const old = slots[index]
      if (!old || dependencies.some((value, i) => value !== old.dependencies[i])) {
        effects.push(() => { old?.cleanup?.(); slots[index] = { dependencies, cleanup: callback() } })
      }
    },
  }
  const cache = new Map()
  function load(relative) {
    const filename = resolve(sourceRoot, relative)
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const localRequire = (specifier) => {
      if (specifier in overrides) return overrides[specifier]
      if (specifier === 'react') return hooks
      if (specifier.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
      if (specifier.startsWith('@/') || specifier.startsWith('.')) {
        const base = specifier.startsWith('@/') ? resolve(sourceRoot, specifier.slice(2)) : resolve(dirname(filename), specifier)
        return load(existsSync(base + '.ts') ? base + '.ts' : base + '.tsx')
      }
      return require(specifier)
    }
    class Clock extends Date { static now() { return now } }
    new Function('require', 'module', 'exports', 'window', 'document', 'HTMLElement', 'Date', 'setTimeout', 'clearTimeout',
      compile(readFileSync(filename, 'utf8')))(localRequire, module, module.exports, window, document, Element, Clock,
      (callback, delay) => { const id = ++nextTimer; timers.set(id, { at: now + delay, callback }); return id },
      (id) => timers.delete(id))
    return module.exports
  }
  return {
    load, document, Element, timers,
    now: () => now,
    jump: (delta) => { now += delta },
    render: (callback = renderCallback, attach = () => {}) => {
      renderCallback = callback; cursor = 0
      const result = callback(); attach(result)
      effects.splice(0).forEach((effect) => effect())
      return result
    },
    advance: (delta) => {
      now += delta
      for (const [id, timer] of [...timers]) if (timer.at <= now && timers.has(id)) {
        timers.delete(id); timer.callback()
      }
    },
    emit: (name, target = 'window', event = {}) => events.get(`${target}:${name}`)?.forEach((listener) => listener(event)),
    unmount: () => slots.forEach((slot) => slot?.cleanup?.()),
    listenerCount: () => [...events.values()].reduce((total, listeners) => total + listeners.size, 0),
  }
}

export function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, predicate))
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)]
}
export function textContent(tree) {
  if (Array.isArray(tree)) return tree.map(textContent).join('')
  return tree && typeof tree === 'object' ? textContent(tree.props?.children) : String(tree ?? '')
}
export const settle = () => new Promise((done) => setImmediate(done))
