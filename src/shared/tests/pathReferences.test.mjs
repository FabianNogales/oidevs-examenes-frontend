import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

// Path integrity guard: test scripts, browser QA scripts and contracts often name source files by a
// quoted literal path (h.load of a features path, resolve(sourceRoot, …), a /src/features import in a
// QA demo). A folder reorganisation (e.g. syncing origin/Arqmoc) moves files without git reporting
// these strings, so every such literal must point to an existing file or folder.
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const srcRoot = resolve(repoRoot, 'src')

// Quoted literals that start with a features path in one of the forms used in this repository:
//   features/<path>      relative to src (harnesses)     @/features/<path>   Vite/TS alias
//   src/features/<path>  relative to the repo root       /src/features/<path>  Vite dev URL
// Literals with interpolation (${…}), globs (*) or whitespace are dynamic and are not checked.
const LITERAL = /(['"`])((?:\/?src\/|@\/)?features\/[^'"`\s$*{}]+)\1/g
const EXTENSIONS = ['', '.tsx', '.ts', '.mjs', '.js', '.css', '/index.ts', '/index.tsx']

export function featureReferences(text) {
  return [...text.matchAll(LITERAL)].map((match) => match[2].replace(/[?#].*$/, ''))
}

export function resolvesToExisting(reference) {
  const relative = reference.replace(/^\/?src\//, '').replace(/^@\//, '')
  const base = resolve(srcRoot, relative)
  return EXTENSIONS.some((extension) => existsSync(base + extension))
}

export function missingReferences(text) {
  return [...new Set(featureReferences(text))].filter((reference) => !resolvesToExisting(reference))
}

// Scanned files: every test, browser QA script and test helper under src (not production code,
// whose imports are already checked by TypeScript and the build).
function scannedFiles() {
  return readdirSync(srcRoot, { recursive: true })
    .map((file) => String(file).replaceAll('\\', '/'))
    .filter((file) => /\.(test|browser)\.mjs$/.test(file) || /(^|\/)tests\/[^/]+\.mjs$/.test(file))
    .filter((file) => statSync(resolve(srcRoot, file)).isFile())
    .sort()
}

test('every literal src/features path in tests, QA scripts and contracts exists', () => {
  const files = scannedFiles()
  let checked = 0
  const broken = []
  for (const file of files) {
    const text = readFileSync(resolve(srcRoot, file), 'utf8')
    checked += new Set(featureReferences(text)).size
    for (const reference of missingReferences(text)) broken.push(`${file} → ${reference}`)
  }
  // Guard against a vacuous pass (e.g. a broken pattern that matches nothing).
  assert.ok(files.length > 40, `scanned ${files.length} files`)
  assert.ok(checked > 100, `checked ${checked} references`)
  assert.deepEqual(broken, [], `stale feature paths:\n${broken.join('\n')}`)
})

test('the detector flags a missing path and ignores valid, relative, aliased and dynamic forms', () => {
  // Built at runtime so this file never contains a broken literal itself.
  const missing = ['features', '__missing_feature__', 'pages', 'Gone.tsx'].join('/')
  const sample = [
    `h.load('${missing}')`,
    `import x from '/src/${missing}'`,
    `resolve(root, 'src/features/rooms/pages/AdminRoomsPage.tsx')`,
    `h.load('features/rooms/pages/AdminRoomsPage.tsx')`,
    `import { X } from '@/features/rooms/pages/AdminRoomsPage'`,
    `import '/src/features/rooms/pages/AdminRoomsPage.tsx?raw'`,
    `const folder = 'features/rooms/components/import'`,
    "import y from '../pages/AdminRoomsPage'",
    'const dynamic = `features/${name}/pages/X.tsx`',
    "const pattern = 'src/features/**/*.tsx'",
  ].join('\n')
  assert.deepEqual(missingReferences(sample), [missing, `/src/${missing}`])
  assert.equal(featureReferences(sample).length, 7, 'relative, dynamic and glob forms are not collected')
  assert.ok(resolvesToExisting('@/features/rooms/pages/AdminRoomsPage'))
  assert.ok(resolvesToExisting('/src/features/rooms/pages/AdminRoomsPage.tsx'))
  assert.ok(resolvesToExisting('features/rooms/components/import'))
  assert.equal(resolvesToExisting(missing), false)
})
