// DS5-F1: live browser QA never runs by default. Static checks (no live script is executed) plus a
// simulated child process that proves the gate stops before any later code.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { liveQaEnabled, requireLiveQa } from './liveQa.mjs'

const root = join(process.cwd(), 'src')
const browserScripts = readdirSync(root, { recursive: true })
  .map((file) => String(file).replaceAll('\\', '/'))
  .filter((file) => file.endsWith('.browser.mjs'))
// Real app/backend hosts, real credentials or the disposable Laravel fixture.
const liveMarker =
  /(localhost|127\.0\.0\.1):(8000|5173)\b|EIDA_QA_ADMIN_|tmp\/sprint3-integration/
const codeLines = (source) =>
  source
    .split(/\r?\n/)
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => !/^\s*\/\//.test(text))
const read = (file) => readFileSync(join(root, file), 'utf8')

const LIVE = {
  'features/portal-news/tests/hu40.browser.mjs': 'hu40',
  'features/portal-news/tests/hu41.browser.mjs': 'hu41',
  'features/incidents/tests/sprint3.integration.browser.mjs': 'sprint3',
}

test('only explicit per-script tokens enable live QA', () => {
  assert.equal(liveQaEnabled('hu41', {}), false)
  assert.equal(liveQaEnabled('hu41', { EIDA_LIVE_QA: '' }), false)
  assert.equal(liveQaEnabled('hu41', { EIDA_LIVE_QA: '1' }), false)
  assert.equal(liveQaEnabled('hu41', { EIDA_LIVE_QA: 'true' }), false)
  assert.equal(liveQaEnabled('hu41', { EIDA_LIVE_QA: 'hu40' }), false)
  assert.equal(liveQaEnabled('hu41', { EIDA_LIVE_QA: 'hu41' }), true)
  assert.equal(liveQaEnabled('hu41', { EIDA_LIVE_QA: 'hu40, hu41' }), true)
})

test('the live inventory is closed: every script with live markers is gated', () => {
  const withMarkers = browserScripts.filter((file) =>
    codeLines(read(file)).some(({ text }) => liveMarker.test(text)),
  )
  assert.deepEqual(withMarkers.sort(), Object.keys(LIVE).sort())
  for (const [file, name] of Object.entries(LIVE)) {
    assert.match(
      read(file),
      /import \{ requireLiveQa \} from '\.\.\/\.\.\/\.\.\/shared\/tests\/liveQa\.mjs'/,
      file,
    )
    assert.ok(
      read(file).includes(`requireLiveQa('${name}'`) ||
        read(file).includes(`'${name}',`),
      file,
    )
  }
})

test('hu41 and sprint3 stop before any work when the gate is closed', () => {
  for (const file of [
    'features/portal-news/tests/hu41.browser.mjs',
    'features/incidents/tests/sprint3.integration.browser.mjs',
  ]) {
    const lines = codeLines(read(file))
    const firstWork = lines.find(
      ({ text }) =>
        text.trim() &&
        !/^\s*(import\b|\}|[\w\s,{}]*\} from |[A-Za-z_]+,?$)/.test(text),
    )
    assert.match(
      firstWork.text,
      /^if \(\s*$|^if \(!requireLiveQa\(/,
      `${file}: first statement must be the gate`,
    )
    const gateEnd = lines.findIndex(({ text }) =>
      /process\.exit\(0\)/.test(text),
    )
    const firstMarker = lines.findIndex(({ text }) => liveMarker.test(text))
    assert.ok(
      gateEnd >= 0 &&
        gateEnd < lines.findIndex(({ text }) => /\bawait\b/.test(text)),
      file,
    )
    assert.ok(firstMarker === -1 || gateEnd < firstMarker, file)
  }
})

test('hu40 keeps every live call inside its gated block', () => {
  const source = read('features/portal-news/tests/hu40.browser.mjs')
  assert.match(source, /const liveQa = requireLiveQa\('hu40',/)
  const lines = codeLines(source)
  const start = lines.findIndex(({ text }) => text.trim() === 'if (liveQa) {')
  const end = lines.findIndex(
    ({ text }) => text.trim() === '} // end live QA (hu40)',
  )
  assert.ok(start > 0 && end > start)
  const outside = lines.filter(
    ({ text }, position) =>
      liveMarker.test(text) && (position < start || position > end),
  )
  assert.deepEqual(
    outside.map(({ text }) => text.trim()),
    [],
  )
})

test('a closed gate prints SKIP and exits 0 before later code (simulated process)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'eida-live-qa-'))
  try {
    const script = join(dir, 'gated.mjs')
    writeFileSync(
      script,
      `import { requireLiveQa } from ${JSON.stringify(pathToFileURL(join(root, 'shared/tests/liveQa.mjs')).href)}\n` +
        `if (!requireLiveQa('simulated', 'proceso simulado')) process.exit(0)\nconsole.log('REACHED')\n`,
    )
    const env = { ...process.env }
    delete env.EIDA_LIVE_QA
    const closed = spawnSync(process.execPath, [script], {
      env,
      encoding: 'utf8',
    })
    assert.equal(closed.status, 0)
    assert.match(closed.stdout, /^SKIP simulated: prueba en vivo/)
    assert.doesNotMatch(closed.stdout, /REACHED/)
    const open = spawnSync(process.execPath, [script], {
      env: { ...env, EIDA_LIVE_QA: 'simulated' },
      encoding: 'utf8',
    })
    assert.match(open.stdout, /REACHED/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('requireLiveQa reports the opt-in variable', (t) => {
  const messages = []
  t.mock.method(console, 'log', (message) => messages.push(message))
  assert.equal(requireLiveQa('hu41', 'motivo', {}), false)
  assert.match(messages[0], /EIDA_LIVE_QA=hu41/)
})

// Syntax-tree check of hu40 (the tool that runs the agents refuses to execute this script, so its isolation is
// proven statically): the gate is a top-level const, every real host is inside `if (liveQa)`, and every URL
// outside that block targets the script's own Vite/Chrome through a dynamic port.
test('hu40 AST: real hosts only inside the gated block, other URLs use a dynamic local port', async () => {
  const { ts } = await import('./sourceHarness.mjs')
  const file = 'features/portal-news/tests/hu40.browser.mjs'
  const source = ts.createSourceFile(
    file,
    read(file),
    ts.ScriptTarget.Latest,
    true,
  )
  const gate = source.statements.find(
    (node) =>
      ts.isVariableStatement(node) &&
      node.declarationList.flags & ts.NodeFlags.Const &&
      node.declarationList.declarations[0].name.getText() === 'liveQa',
  )
  assert.ok(gate, 'top-level const liveQa')
  assert.match(
    gate.declarationList.declarations[0].initializer.getText(),
    /^requireLiveQa\('hu40',/,
  )
  const gatedBlocks = []
  const urls = []
  const visit = (node) => {
    if (ts.isIfStatement(node) && node.expression.getText() === 'liveQa')
      gatedBlocks.push(node.thenStatement)
    if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
      const text = node.getText()
      if (/https?:\/\//.test(text)) urls.push(node)
    }
    if (ts.isBinaryExpression(node) && node.left.getText() === 'liveQa')
      assert.fail('liveQa is never reassigned')
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(gatedBlocks.length, 1, 'one gated live block')
  const inside = (node) =>
    node.getStart() >= gatedBlocks[0].getStart() &&
    node.getEnd() <= gatedBlocks[0].getEnd()
  const outside = urls.filter((node) => !inside(node))
  assert.deepEqual(
    outside
      .filter((node) => liveMarker.test(node.getText()))
      .map((node) => node.getText()),
    [],
  )
  // Outside the block: only 127.0.0.1 with a port taken from the running Vite/Chrome (never a fixed port).
  for (const node of outside) {
    assert.ok(ts.isTemplateExpression(node), `URL dinámica: ${node.getText()}`)
    assert.match(
      node.getText(),
      /^`http:\/\/127\.0\.0\.1:\$\{(port|vite\.httpServer\.address\(\)\.port)\}\//,
      node.getText(),
    )
  }
  assert.ok(
    urls.filter(inside).length >= 3,
    'the live calls are still present inside the gated block',
  )
})
