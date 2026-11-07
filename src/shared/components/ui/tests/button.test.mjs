import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

// Real Button/ButtonLink source rendered with React SSR and the real react-router (MemoryRouter).
// CSS Modules are replaced by a proxy that returns the class key. Markup and semantics only.
const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { MemoryRouter } = require('react-router')
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
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const base = specifier.startsWith('@/') ? resolve(srcRoot, specifier.slice(2)) : resolve(dirname(filename), specifier)
      const found = ['.tsx', '.ts'].map((ext) => base + ext).find(existsSync)
      assert.ok(found, `cannot resolve ${specifier} from ${filename}`)
      return load(found)
    }
    return require(specifier)
  }
  new Function('exports', 'require', 'module', output)(module.exports, localRequire, module)
  return module.exports
}

const { Button } = load(resolve(uiRoot, 'Button/Button.tsx'))
const { ButtonLink } = load(resolve(uiRoot, 'Button/ButtonLink.tsx'))
const h = React.createElement
const render = (element) => renderToStaticMarkup(h(MemoryRouter, null, element))

test('Button renders the four variants and both sizes with type="button" by default', () => {
  for (const variant of ['primary', 'secondary', 'danger', 'ghost']) {
    assert.equal(render(h(Button, { variant }, 'Guardar')), `<button type="button" class="button ${variant}">Guardar</button>`)
  }
  assert.equal(render(h(Button, null, 'Guardar')), '<button type="button" class="button primary">Guardar</button>')
  assert.equal(render(h(Button, { size: 'sm' }, 'Ver')), '<button type="button" class="button primary sm">Ver</button>')
  assert.equal(render(h(Button, { size: 'md' }, 'Ver')), '<button type="button" class="button primary">Ver</button>')
})

test('Button keeps an explicit type and propagates native attributes and className', () => {
  const html = render(h(Button, { type: 'submit', form: 'room-form', name: 'intent', value: 'save', id: 'save', className: 'extra', 'data-qa': 'x', title: 'Guardar aula' }, 'Guardar'))
  assert.match(html, /^<button [^>]*>Guardar<\/button>$/)
  for (const attribute of ['form="room-form"', 'name="intent"', 'value="save"', 'id="save"', 'data-qa="x"', 'title="Guardar aula"', 'type="submit"', 'class="button primary extra"']) {
    assert.ok(html.includes(` ${attribute}`), `missing ${attribute}`)
  }
  assert.equal((html.match(/type="/g) ?? []).length, 1)
})

test('Button loading disables it and sets aria-busy; explicit disabled has no aria-busy', () => {
  const loading = render(h(Button, { loading: true }, 'Guardando…'))
  assert.match(loading, /disabled=""/)
  assert.match(loading, /aria-busy="true"/)
  assert.match(loading, />Guardando…<\/button>$/)
  const disabled = render(h(Button, { disabled: true }, 'Guardar'))
  assert.match(disabled, /disabled=""/)
  assert.doesNotMatch(disabled, /aria-busy/)
  assert.doesNotMatch(render(h(Button, null, 'Guardar')), /disabled|aria-busy/)
})

test('Button keeps the accessible name given by the consumer and imposes none', () => {
  assert.doesNotMatch(render(h(Button, null, 'Guardar')), /aria-label/)
  // Icon-only buttons need a name from the consumer.
  const icon = render(h(Button, { variant: 'ghost', 'aria-label': 'Cerrar diálogo' }, h('svg', { 'aria-hidden': 'true' })))
  assert.match(icon, /aria-label="Cerrar diálogo"/)
  assert.match(icon, /<svg aria-hidden="true"><\/svg>/)
})

test('ButtonLink renders a real link with the destination, attributes and Button classes', () => {
  const html = render(h(ButtonLink, { to: '/admin/rooms/import', variant: 'secondary', size: 'sm', className: 'extra', 'aria-label': 'Importar aulas (CSV)', title: 'Importar' }, '+ Importar aulas (CSV)'))
  assert.match(html, /^<a /)
  assert.doesNotMatch(html, /<button|disabled|aria-busy|type=/)
  assert.match(html, /href="\/admin\/rooms\/import"/)
  assert.match(html, /aria-label="Importar aulas \(CSV\)"/)
  assert.match(html, /title="Importar"/)
  assert.match(html, /class="button secondary sm extra"/)
  assert.match(html, />\+ Importar aulas \(CSV\)<\/a>$/)
  assert.match(render(h(ButtonLink, { to: '/admin' }, 'Inicio')), /class="button primary"/)
})

test('ButtonLink does not expose disabled or loading props', () => {
  const source = readFileSync(resolve(uiRoot, 'Button/ButtonLink.tsx'), 'utf8')
  assert.doesNotMatch(source, /\b(loading|disabled)\s*[?:]/)
  assert.match(source, /from 'react-router'/)
})

test('Button CSS uses tokens and defines hover, active, focus-visible and disabled states', () => {
  const css = readFileSync(resolve(uiRoot, 'Button/Button.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, 'no literal colours')
  assert.doesNotMatch(css, /font-size:\s*[\d.]+px/, 'no px font sizes')
  assert.doesNotMatch(css, /:global|!important/)
  assert.match(css, /\.button \{[^}]*min-height: var\(--control-height\);[^}]*border-radius: var\(--radius-md\);/)
  assert.match(css, /\.sm \{[^}]*min-height: var\(--control-height-sm\);/)
  assert.match(css, /\.button:focus-visible \{[^}]*outline: var\(--focus-width\) solid var\(--color-focus\);[^}]*outline-offset: var\(--focus-offset\);/)
  assert.match(css, /\.button:disabled \{[^}]*background: var\(--color-disabled-background\);[^}]*color: var\(--color-disabled-text\);/)
  for (const variant of ['primary', 'secondary', 'danger', 'ghost']) {
    assert.match(css, new RegExp(`\\.${variant} \\{`), `${variant} base`)
    assert.match(css, new RegExp(`\\.${variant}:hover:not\\(:disabled\\) \\{`), `${variant} hover`)
    assert.match(css, new RegExp(`\\.${variant}:active:not\\(:disabled\\) \\{`), `${variant} active`)
  }
  assert.match(css, /\.danger:hover:not\(:disabled\) \{\s*background: color-mix\(in srgb, var\(--color-error\)/)
  // base.css fades disabled buttons (:where(button:disabled) { opacity: 0.65 }); the DS state keeps full opacity.
  assert.match(css, /\.button:disabled \{[^}]*opacity: 1;/)
  // Every class referenced by the components exists in the CSS Module.
  for (const file of ['Button/Button.tsx', 'Button/ButtonLink.tsx']) {
    const source = readFileSync(resolve(uiRoot, file), 'utf8')
    const used = new Set([...source.matchAll(/styles\.(\w+)/g)].map(([, key]) => key))
    used.add('primary'); used.add('secondary'); used.add('danger'); used.add('ghost') // styles[variant]
    for (const key of used) assert.match(css, new RegExp(`\\.${key}\\b`), `${file}: .${key} missing`)
  }
  // Every colour-like declaration uses tokens (var/color-mix of vars) or transparent.
  for (const [, value] of css.matchAll(/(?:^|[\s;{])(?:background|color|border-color):\s*([^;]+);/g)) {
    assert.match(value.trim(), /^(transparent|var\(--[\w-]+\)|color-mix\(in srgb, var\(--[\w-]+\) \d+%, var\(--[\w-]+\)\))$/, `token value: ${value}`)
  }
})

// Closed list of authorized consumers per component (DS2.2c: the Rooms pilot is the first adopter;
// DS4.1a: the teacher's subject students page).
const authorizedConsumers = {
  Button: [
    'features/rooms/components/RoomDetails.tsx',
    'features/rooms/components/RoomDialog.tsx',
    'features/rooms/components/RoomForm.tsx',
    'features/rooms/components/RoomStatusDialog.tsx',
    'features/rooms/pages/AdminRoomsPage.tsx',
    'features/students/pages/TeacherSubjectStudentsPage.tsx',
  ],
  ButtonLink: [
    'features/rooms/pages/AdminRoomsPage.tsx',
    'features/students/pages/TeacherSubjectStudentsPage.tsx',
  ],
}
// Migrated scopes: any new consumer outside them needs its own Design System subetapa.
const migratedScopes = ['features/rooms/', 'features/students/pages/TeacherSubjectStudentsPage.tsx']
const consumersOf = (sources, component) =>
  [...sources].filter(([, text]) => new RegExp(`components/ui/Button/${component}['"]`).test(text)).map(([file]) => file).sort()
const folderConsumers = (sources) => [...sources].filter(([, text]) => /components\/ui\/Button\//.test(text)).map(([file]) => file).sort()
const allowedFiles = [...new Set(Object.values(authorizedConsumers).flat())].sort()

test('Button and ButtonLink are consumed only by the authorized files (DS2.2c)', () => {
  const { readdirSync } = require('node:fs')
  const sources = new Map(readdirSync(srcRoot, { recursive: true })
    .map((file) => String(file).replaceAll('\\', '/'))
    .filter((file) => /\.(tsx|ts)$/.test(file) && !file.startsWith('shared/components/ui/'))
    .map((file) => [file, readFileSync(resolve(srcRoot, file), 'utf8')]))
  for (const [component, expected] of Object.entries(authorizedConsumers)) {
    assert.deepEqual(consumersOf(sources, component), expected, `${component} consumers`)
  }
  // Any reference to the Button folder (any file or path form) must come from an authorized file.
  assert.deepEqual(folderConsumers(sources), allowedFiles)
  assert.ok(allowedFiles.every((file) => migratedScopes.some((scope) => file.startsWith(scope))), 'only migrated scopes are authorized')
})

test('the consumer guard rejects an unauthorized import (negative check)', () => {
  const sources = new Map([
    ...allowedFiles.map((file) => [file, "import { Button } from '@/shared/components/ui/Button/Button'\nimport { ButtonLink } from '@/shared/components/ui/Button/ButtonLink'"]),
    ['features/exams/pages/EntryControlPage.tsx', "import { Button } from '@/shared/components/ui/Button/Button'"],
  ])
  assert.notDeepEqual(consumersOf(sources, 'Button'), authorizedConsumers.Button)
  assert.ok(consumersOf(sources, 'Button').includes('features/exams/pages/EntryControlPage.tsx'))
  assert.notDeepEqual(folderConsumers(sources), allowedFiles)
})
