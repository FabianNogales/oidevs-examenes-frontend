import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
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
    'src/shared/components/PortalDialog/PortalDialog.tsx',
    'src/shared/components/ConfirmDialog/ConfirmDialog.tsx',
    'src/features/portal-shared/PortalAdminCollection.tsx',
    'src/features/portal-shared/PortalUi.tsx',
    'src/features/portal-shared/AdminStatusBadge.tsx',
    'src/features/portal-calendar/components/CalendarModal.tsx',
    'src/features/portal-calendar/components/EventForm.tsx',
    'src/features/portal-calendar/pages/AdminCalendarPage.tsx',
    'src/features/portal-information/AdminInformationPage.tsx',
    'src/features/portal-information/InformationEditor.tsx',
    'src/features/portal-news/AdminNewsPage.tsx',
    'src/features/portal-news/NewsEditor.tsx',
    'src/features/portal-services/AdminServicesPage.tsx',
    'src/features/portal-services/ServiceEditor.tsx',
    'src/features/course-offerings/components/OfferingImportPanel.tsx',
    'src/shared/components/ui/PageContainer/PageContainer.tsx',
    'src/shared/components/ui/PageHeader/PageHeader.tsx',
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

// DS1.3: global.css is only an ordered entry point; cascade order depends on this list.
const globalStyles = 'src/assets/styles'
const globalImports = ['tokens.css', 'base.css', 'shell.css', 'auth.css', 'snackbar.css', 'responsive.css']
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
function tokenBlocks(css) {
  const blocks = new Map()
  for (const [, selector, body] of stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))
    blocks.set(selector.replace(/\s+/g, ' ').trim(), declarations)
  }
  return blocks
}

test('global.css only imports the six style layers in cascade order', () => {
  const lines = read(`${globalStyles}/global.css`).split(/\r?\n/).filter((line) => line.trim())
  assert.deepEqual(lines, globalImports.map((name) => `@import './${name}';`))
  assert.match(read('src/main.tsx'), /import\s+['"]@\/assets\/styles\/global\.css['"]/)
  for (const name of globalImports) {
    const css = stripComments(read(`${globalStyles}/${name}`))
    assert.ok(css.trim(), `${name} must not be empty`)
    assert.doesNotMatch(css, /@import\b/, `${name} must not chain further imports`)
  }
})

test('tokens.css keeps the documented tokens and their current values', () => {
  const blocks = tokenBlocks(read(`${globalStyles}/tokens.css`))
  assert.deepEqual([...blocks.keys()], [':root', ":root, [data-theme='light']", "[data-theme='dark']"])
  const base = blocks.get(':root')
  const light = blocks.get(":root, [data-theme='light']")
  const dark = blocks.get("[data-theme='dark']")
  const expectedBase = {
    '--brand-navy': '#172554', '--brand-blue': '#2563eb', '--brand-cobalt': '#0049a8', '--brand-crimson': '#8b1e3f',
    '--brand-pink': '#d67a8c', '--brand-pink-light': '#f7e9ed', '--brand-blue-light': '#eaf3ff',
    '--brand-azure-mist': '#e9f9f6', '--brand-white-warm': '#fafafa',
    '--font-size-xs': '0.75rem', '--font-size-sm': '0.875rem', '--font-size-md': '1rem', '--font-size-lg': '1.125rem',
    '--font-size-xl': '1.25rem', '--font-size-2xl': '1.5rem', '--font-size-3xl': '2rem', '--font-size-4xl': '2.5rem',
    '--font-weight-regular': '400', '--font-weight-medium': '500', '--font-weight-semibold': '600', '--font-weight-bold': '700',
    '--line-height-tight': '1.25', '--line-height-normal': '1.5', '--line-height-relaxed': '1.6',
    '--space-1': '4px', '--space-2': '8px', '--space-3': '12px', '--space-4': '16px', '--space-5': '20px',
    '--space-6': '24px', '--space-8': '32px', '--space-10': '40px', '--space-12': '48px', '--space-16': '64px',
    '--radius-sm': '6px', '--radius-md': '10px', '--radius-lg': '16px', '--radius-xl': '20px', '--radius-pill': '9999px',
    '--button-height': '44px', '--input-height': '44px', '--button-radius': 'var(--radius-md)', '--input-radius': 'var(--radius-md)',
    '--content-max-width': '1280px', '--content-gutter': 'var(--space-4)', '--header-height': '7rem', '--footer-height': '3rem',
    '--transition-fast': '150ms ease', '--transition-normal': '250ms ease', '--focus-width': '3px', '--focus-offset': '4px',
  }
  for (const [name, value] of Object.entries(expectedBase)) assert.equal(base.get(name), value, `:root ${name}`)
  for (const name of ['--font-family', '--font-family-base', '--app-header-height']) assert.ok(base.has(name), `:root ${name}`)
  const expectedLight = {
    '--color-primary': 'var(--brand-cobalt)', '--color-on-primary': '#ffffff', '--color-accent': '#d9153b',
    '--color-background': 'var(--brand-blue-light)', '--color-surface': '#ffffff', '--color-text': 'var(--brand-navy)',
    '--color-text-secondary': '#52627a', '--color-text-muted': '#5b6a80', '--color-border': '#dce5f2',
    '--color-success': '#15803d', '--color-success-soft': '#dcfce7', '--color-warning': '#b45309', '--color-warning-soft': '#fef3c7',
    '--color-error': '#b91c1c', '--color-error-soft': '#fee2e2', '--color-info': 'var(--color-primary-hover)', '--color-info-soft': '#dbeafe',
    '--color-focus': 'var(--color-primary)',
  }
  for (const [name, value] of Object.entries(expectedLight)) assert.equal(light.get(name), value, `light ${name}`)
  // Every semantic colour and shadow of the light theme stays redefined by the (inactive) dark theme.
  const semantic = [...light.keys()].filter((name) => name.startsWith('--color-') || name.startsWith('--shadow-'))
  assert.ok(semantic.length >= 49, `light theme semantic token set shrank (${semantic.length})`)
  assert.deepEqual(semantic.filter((name) => !dark.has(name)), [])
})

// DS1.4a: approved semantic tokens, declared without consumers and without touching the dark theme.
const ds14aTokens = {
  base: { '--control-height': 'var(--button-height)', '--control-height-sm': '36px' },
  light: {
    '--status-neutral-bg': 'var(--color-surface-soft)', '--status-neutral-fg': 'var(--color-text-secondary)',
    '--status-info-bg': 'var(--color-info-soft)', '--status-info-fg': 'var(--color-primary)',
    '--status-success-bg': 'var(--color-success-soft)', '--status-success-fg': 'var(--color-success)',
    '--status-warning-bg': 'var(--color-warning-soft)', '--status-warning-fg': 'var(--color-warning)',
    '--status-danger-bg': 'var(--color-error-soft)', '--status-danger-fg': 'var(--color-error)',
  },
}

test('DS1.4a semantic tokens exist with their approved values', () => {
  const blocks = tokenBlocks(read(`${globalStyles}/tokens.css`))
  const base = blocks.get(':root')
  const light = blocks.get(":root, [data-theme='light']")
  for (const [name, value] of Object.entries(ds14aTokens.base)) assert.equal(base.get(name), value, `:root ${name}`)
  for (const [name, value] of Object.entries(ds14aTokens.light)) assert.equal(light.get(name), value, `light ${name}`)
  assert.deepEqual([...base.keys()].filter((name) => name.startsWith('--control-')), Object.keys(ds14aTokens.base))
  assert.deepEqual([...light.keys()].filter((name) => name.startsWith('--status-')), Object.keys(ds14aTokens.light))
})

// DS1.4b: approved stacking scale, declared only in :root and not consumed yet.
const ds14bTokens = { '--z-sticky': '50', '--z-dropdown': '60', '--z-dialog': '1000', '--z-toast': '1100' }

test('DS1.4b z-index tokens exist only in :root with their approved values', () => {
  const blocks = tokenBlocks(read(`${globalStyles}/tokens.css`))
  const base = blocks.get(':root')
  for (const [name, value] of Object.entries(ds14bTokens)) assert.equal(base.get(name), value, `:root ${name}`)
  assert.deepEqual([...base.keys()].filter((name) => name.startsWith('--z-')), Object.keys(ds14bTokens))
  for (const [selector, declarations] of blocks) {
    if (selector === ':root') continue
    assert.deepEqual([...declarations.keys()].filter((name) => name.startsWith('--z-')), [], `${selector} must not declare --z-*`)
  }
})

// Closed list of authorized DS1.4 token consumers (DS2.2a: the Button primitive uses the control heights).
// Patterns are stored as source strings and compiled per use, so no RegExp state (lastIndex) is shared.
const ds14Consumers = { 'src/shared/components/ui/Button/Button.module.css': String.raw`--control-height(-sm)?(?![\w-])` }

test('DS1.4 tokens are consumed only by authorized files and the dark theme block is unchanged', () => {
  const tokensFile = `${globalStyles}/tokens.css`
  const sources = readdirSync(resolve(root, 'src'), { recursive: true })
    .map((file) => `src/${String(file).replaceAll('\\', '/')}`)
    .filter((file) => /\.(css|tsx|jsx|ts|js)$/.test(file) && file !== tokensFile)
  for (const file of sources) {
    const allowed = ds14Consumers[file]
    const content = allowed ? read(file).replaceAll(new RegExp(allowed, 'g'), '') : read(file)
    assert.doesNotMatch(content, /--(status|control-height|z-)[\w-]*/, `${file} must not consume DS1.4 tokens yet`)
  }
  for (const [file, pattern] of Object.entries(ds14Consumers)) assert.match(read(file), new RegExp(pattern), `${file} is an authorized consumer`)
  const css = stripComments(read(tokensFile))
  const [, darkBody] = /\[data-theme='dark'\]\s*\{([^{}]*)\}/.exec(css)
  const declarations = [...darkBody.matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g)].map(([, name, value]) => `${name}:${value.trim()}`)
  assert.equal(declarations.length, 50)
  assert.equal(createHash('sha256').update(declarations.join(';')).digest('hex'), '2fe73df5325679a1d4778c40e23f7400f0edeccfddacb729c67789329f1f87bc', 'dark theme block changed')
})

test('no component activates a data-theme', () => {
  const sources = readdirSync(resolve(root, 'src'), { recursive: true })
    .map((file) => String(file).replaceAll('\\', '/'))
    .filter((file) => /\.(tsx|jsx|ts|js)$/.test(file))
  assert.ok(sources.length > 100)
  for (const file of sources) {
    assert.doesNotMatch(read(`src/${file}`), /data-theme|dataset\.theme/, `${file} must not set data-theme`)
  }
})
