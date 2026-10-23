import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { preprocessCSS, resolveConfig } from 'vite'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = fileURLToPath(new URL('../../../', import.meta.url))
const read = (file) => readFileSync(resolve(root, file), 'utf8')
const exportsCache = new Map()
const cssConfig = await resolveConfig({ configFile: false, root, css: { postcss: {} } }, 'serve')
async function cssExports(file) {
  if (!exportsCache.has(file)) {
    const result = await preprocessCSS(readFileSync(file, 'utf8'), file, cssConfig)
    exportsCache.set(file, result.modules)
  }
  return exportsCache.get(file)
}

test('CSV consumers and repaired components reference real CSS Module exports', async () => {
  const files = [
    'src/features/rooms/pages/ImportRoomsPage.tsx',
    'src/features/subjects/pages/ImportSubjectsPage.tsx',
    'src/features/students/components/CsvDropzone.tsx',
    'src/features/admin/profile/components/EntityProfileLayout.tsx',
    'src/shared/components/DataTable/DataTable.tsx',
    'src/features/course-offerings/components/OfferingImportPanel.tsx',
  ]
  for (const feature of ['rooms', 'subjects']) {
    const folder = `src/features/${feature}/components/import`
    files.push(...readdirSync(resolve(root, folder)).filter((name) => name.endsWith('.tsx')).map((name) => `${folder}/${name}`))
  }
  for (const file of files) {
    const source = read(file)
    for (const [, binding, ref] of source.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+\.module\.css)['"]/g)) {
      const cssFile = ref.startsWith('@/') ? resolve(root, 'src', ref.slice(2)) : resolve(root, dirname(file), ref)
      const exported = await cssExports(cssFile)
      // SubjectCsvDropzone also consumes its defaultStyles through the styles prop.
      const bindings = binding === 'defaultStyles' ? [binding, 'styles'] : [binding]
      for (const name of bindings) {
        for (const [, key] of source.matchAll(new RegExp(`\\b${name}\\.([A-Za-z_]\\w*)`, 'g'))) {
          assert.ok(exported?.[key], `${file}: ${name}.${key} is missing from ${ref}`)
        }
      }
    }
  }
  // The offerings override must cover the same dropzone contract as the default.
  const offeringExports = await cssExports(resolve(root, 'src/features/course-offerings/components/OfferingImport.module.css'))
  for (const [, key] of read('src/features/subjects/components/import/SubjectCsvDropzone.tsx').matchAll(/\bstyles\.([A-Za-z_]\w*)/g)) {
    assert.ok(offeringExports?.[key], `OfferingImport is missing dropzone class ${key}`)
  }
})

test('Header publishes its actual height, observes changes and restores the previous value', () => {
  const source = read('src/shared/components/Header/Header.tsx')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
  }).outputText
  for (const previous of ['', '99px']) {
    const values = new Map(previous ? [['--app-header-height', previous]] : [])
    let height = 112
    let refIndex = 0
    let effect
    let onResize
    let observed
    let disconnected = false
    const header = { getBoundingClientRect: () => ({ height }) }
    const style = {
      getPropertyValue: (key) => values.get(key) ?? '',
      getPropertyPriority: () => previous ? 'important' : '',
      setProperty: (key, value, priority = '') => { values.set(key, value); style.priority = priority },
      removeProperty: (key) => values.delete(key),
    }
    const output = {}
    runInNewContext(compiled, {
      exports: output,
      require: (name) => {
        if (name === 'react') return {
          useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
          useRef: () => ({ current: refIndex++ === 1 ? header : null }),
          useId: () => 'navigation',
          useEffect: () => {},
          useLayoutEffect: (callback) => { effect = callback },
        }
        if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null }
        if (name.endsWith('.css')) return { default: {} }
        return {}
      },
      window: { matchMedia: () => ({ matches: false }) },
      document: { documentElement: { style } },
      ResizeObserver: class {
        constructor(callback) { onResize = callback }
        observe(element) { observed = element }
        disconnect() { disconnected = true }
      },
    })
    output.Header({ navigation: [] })
    const cleanup = effect()
    assert.equal(observed, header)
    assert.equal(values.get('--app-header-height'), '112px')
    height = 184
    onResize()
    assert.equal(values.get('--app-header-height'), '184px')
    cleanup()
    assert.ok(disconnected)
    assert.equal(values.get('--app-header-height') ?? '', previous)
    if (previous) assert.equal(style.priority, 'important')
    // React StrictMode may immediately run setup again after cleanup.
    const secondCleanup = effect()
    assert.equal(values.get('--app-header-height'), '184px')
    secondCleanup()
    assert.equal(values.get('--app-header-height') ?? '', previous)
  }
})
