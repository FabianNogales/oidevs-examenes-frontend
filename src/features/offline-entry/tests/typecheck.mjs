// Focused, no-emit check. Does not run the app's build, lint or complete test suite.
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = fileURLToPath(new URL('../../../../', import.meta.url))
const scan = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? scan(resolve(directory, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [resolve(directory, entry.name)]
        : [],
  )
const appConfig = ts.parseJsonConfigFileContent(
  ts.readConfigFile(resolve(root, 'tsconfig.app.json'), ts.sys.readFile).config,
  ts.sys,
  root,
)
const nodeConfig = ts.parseJsonConfigFileContent(
  ts.readConfigFile(resolve(root, 'tsconfig.node.json'), ts.sys.readFile)
    .config,
  ts.sys,
  root,
)
const options = (config) => ({
  ...config.options,
  noEmit: true,
  incremental: false,
  composite: false,
  tsBuildInfoFile: undefined,
})
const diagnostics = [
  ...ts.getPreEmitDiagnostics(
    ts.createProgram(
      scan(resolve(root, 'src/features/offline-entry')),
      options(appConfig),
    ),
  ),
  ...ts.getPreEmitDiagnostics(
    ts.createProgram(
      [resolve(root, 'build/offlinePwa.ts'), resolve(root, 'vite.config.ts')],
      options(nodeConfig),
    ),
  ),
]
console.log(
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => root,
    getCanonicalFileName: (name) => name,
    getNewLine: () => '\n',
  }),
)
console.log(`Focused TypeScript diagnostics: ${diagnostics.length}`)
process.exitCode = diagnostics.length ? 1 : 0
