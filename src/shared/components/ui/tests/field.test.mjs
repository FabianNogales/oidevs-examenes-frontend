import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

// Real Field/TextInput/Select/Textarea source rendered with React SSR. CSS Modules are replaced by a
// proxy that returns the class key. Markup and semantics only (layout and keyboard: field.browser.mjs).
const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const srcRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const uiRoot = fileURLToPath(new URL('../', import.meta.url))

const cache = new Map()
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const localRequire = (specifier) => {
    if (specifier.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) }
    if (specifier.startsWith('.')) {
      const base = resolve(dirname(filename), specifier)
      const found = ['.tsx', '.ts'].map((ext) => base + ext).find(existsSync)
      assert.ok(found, `cannot resolve ${specifier} from ${filename}`)
      return load(found)
    }
    return require(specifier)
  }
  new Function('exports', 'require', 'module', output)(module.exports, localRequire, module)
  return module.exports
}

const { Field } = load(resolve(uiRoot, 'Field/Field.tsx'))
const { TextInput } = load(resolve(uiRoot, 'Field/TextInput.tsx'))
const { Select } = load(resolve(uiRoot, 'Field/Select.tsx'))
const { Textarea } = load(resolve(uiRoot, 'Field/Textarea.tsx'))
const h = React.createElement
const render = (element) => renderToStaticMarkup(element)
const attr = (html, tag, name) => new RegExp(`<${tag}\\b[^>]*\\s${name}="([^"]*)"`).exec(html)?.[1]

test('Field associates label, control, hint and error and marks the control invalid', () => {
  const html = render(h(Field, { label: 'Código', htmlFor: 'room-code', hint: 'Ej.: A-101', error: 'El código es obligatorio.', required: true },
    (control) => h(TextInput, { ...control, name: 'code' })))
  assert.equal(attr(html, 'label', 'for'), 'room-code')
  assert.equal(attr(html, 'input', 'id'), 'room-code')
  assert.equal(attr(html, 'input', 'aria-describedby'), 'room-code-hint room-code-error')
  assert.equal(attr(html, 'input', 'aria-invalid'), 'true')
  assert.match(html, /<input\b[^>]*\srequired=""/)
  assert.match(html, /<p class="hint" id="room-code-hint">Ej\.: A-101<\/p>/)
  assert.match(html, /<p class="error" id="room-code-error">El código es obligatorio\.<\/p>/)
  assert.match(html, /<label class="label" for="room-code">Código<span class="required" aria-hidden="true">\*<\/span><\/label>/)
  assert.doesNotMatch(html, /role="alert"|aria-live/, 'the error is not a live region')
})

test('Field without hint/error/required leaves the control clean; hint only is described', () => {
  const plain = render(h(Field, { label: 'Nombre', htmlFor: 'name' }, (control) => h(TextInput, control)))
  assert.doesNotMatch(plain, /aria-describedby|aria-invalid|required|class="hint"|class="error"|aria-hidden/)
  const hinted = render(h(Field, { label: 'Nombre', htmlFor: 'name', hint: 'Opcional' }, (control) => h(TextInput, control)))
  assert.equal(attr(hinted, 'input', 'aria-describedby'), 'name-hint')
  assert.doesNotMatch(hinted, /aria-invalid/)
  const errorOnly = render(h(Field, { label: 'Nombre', htmlFor: 'name', error: 'Revisa el nombre.' }, (control) => h(TextInput, control)))
  assert.equal(attr(errorOnly, 'input', 'aria-describedby'), 'name-error')
})

test('Field generates unique ids when htmlFor is omitted', () => {
  const html = render(h('div', null,
    h(Field, { label: 'A', hint: 'a' }, (control) => h(TextInput, control)),
    h(Field, { label: 'B', hint: 'b' }, (control) => h(TextInput, control))))
  const ids = [...html.matchAll(/<input\b[^>]*\sid="([^"]+)"/g)].map((match) => match[1])
  const fors = [...html.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)].map((match) => match[1])
  assert.equal(ids.length, 2)
  assert.notEqual(ids[0], ids[1])
  assert.deepEqual(fors, ids)
  const all = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
  assert.equal(new Set(all).size, all.length, 'no duplicated ids')
  for (const id of ids) assert.match(html, new RegExp(`aria-describedby="${id.replace(/[^\w-]/g, '\\$&')}-hint"`))
})

test('TextInput, Select and Textarea propagate native attributes and the invalid state', () => {
  const input = render(h(TextInput, { name: 'q', placeholder: 'Buscar', maxLength: 20, disabled: true, className: 'extra', autoComplete: 'off' }))
  for (const part of ['name="q"', 'placeholder="Buscar"', 'maxLength="20"', 'disabled=""', 'autoComplete="off"', 'type="text"', 'class="control extra"']) assert.ok(input.includes(part), part)
  assert.doesNotMatch(input, /aria-invalid/)
  assert.match(render(h(TextInput, { type: 'email', invalid: true })), /type="email"[^>]*aria-invalid="true"|aria-invalid="true"[^>]*type="email"/)
  const select = render(h(Select, { name: 'career', defaultValue: 'b', invalid: true },
    h('optgroup', { label: 'Activas' }, h('option', { value: 'a' }, 'Sistemas'), h('option', { value: 'b' }, 'Industrial')),
    h('option', { value: 'c' }, 'Otra')))
  assert.match(select, /^<select name="career" class="control" aria-invalid="true">/)
  assert.match(select, /<optgroup label="Activas"><option value="a">Sistemas<\/option><option value="b" selected="">Industrial<\/option><\/optgroup><option value="c">Otra<\/option><\/select>$/)
  const textarea = render(h(Textarea, { name: 'description', rows: 4, maxLength: 1000, defaultValue: 'Texto' }))
  assert.match(textarea, /^<textarea name="description" rows="4" maxLength="1000" class="control textarea">Texto<\/textarea>$/)
})

test('Field works with Select and Textarea through the same control props', () => {
  const select = render(h(Field, { label: 'Carrera', htmlFor: 'career', error: 'Elige una carrera.' }, (control) => h(Select, control, h('option', { value: '' }, '—'))))
  assert.equal(attr(select, 'select', 'id'), 'career')
  assert.equal(attr(select, 'select', 'aria-invalid'), 'true')
  assert.equal(attr(select, 'select', 'aria-describedby'), 'career-error')
  const textarea = render(h(Field, { label: 'Descripción', htmlFor: 'desc', required: true }, (control) => h(Textarea, control)))
  assert.equal(attr(textarea, 'textarea', 'id'), 'desc')
  assert.match(textarea, /<textarea\b[^>]*\srequired=""/)
})

test('Field and control CSS use tokens and define focus, hover, invalid and disabled states', () => {
  const read = (name) => readFileSync(resolve(uiRoot, `Field/${name}`), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const controls = read('controls.module.css')
  const field = read('Field.module.css')
  for (const css of [controls, field]) {
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, 'no literal colours')
    assert.doesNotMatch(css, /font-size:\s*[\d.]+px/, 'no px font sizes')
    assert.doesNotMatch(css, /:global|!important|--(status|control-height|z-)/, 'no globals or restricted DS1.4 tokens')
    for (const [, value] of css.matchAll(/(?:^|[\s;{])(?:background-color|color|border-color):\s*([^;]+);/g)) {
      assert.match(value.trim(), /^var\(--[\w-]+\)$/, `token value: ${value}`)
    }
  }
  assert.match(controls, /\.control \{[^}]*min-height: var\(--input-height\);[^}]*border: 1px solid var\(--color-input-border\);[^}]*border-radius: var\(--input-radius\);/)
  assert.match(controls, /\.control:focus-visible \{[^}]*outline: var\(--focus-width\) solid var\(--color-focus\);/)
  assert.match(controls, /\.control:hover:not\(:disabled\) \{/)
  assert.match(controls, /\.control\[aria-invalid='true'\] \{[^}]*border-color: var\(--color-error\);/)
  assert.match(controls, /\.control:disabled \{[^}]*background-color: var\(--color-disabled-background\);[^}]*color: var\(--color-disabled-text\);[^}]*opacity: 1;/)
  assert.match(controls, /\.textarea \{[^}]*resize: vertical;/)
  // Every class used by the components exists in its CSS Module.
  for (const [file, css] of [['Field.tsx', field], ['TextInput.tsx', controls], ['Select.tsx', controls], ['Textarea.tsx', controls]]) {
    for (const [, key] of readFileSync(resolve(uiRoot, `Field/${file}`), 'utf8').matchAll(/styles\.(\w+)/g)) {
      assert.match(css, new RegExp(`\\.${key}\\b`), `${file}: .${key} missing`)
    }
  }
})

test('Field, TextInput, Select and Textarea have no consumers yet (DS2.2b)', () => {
  const consumers = readdirSync(srcRoot, { recursive: true })
    .map((file) => String(file).replaceAll('\\', '/'))
    .filter((file) => /\.(tsx|ts)$/.test(file) && !file.startsWith('shared/components/ui/'))
    .filter((file) => /components\/ui\/Field\//.test(readFileSync(resolve(srcRoot, file), 'utf8')))
  assert.deepEqual(consumers, [])
})
