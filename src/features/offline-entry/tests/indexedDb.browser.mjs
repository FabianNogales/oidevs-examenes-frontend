// Focused real IndexedDB check in a new headless Edge profile. No app server or application build.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  realpathSync,
} from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
  trackBrowser,
} from '../../../shared/tests/browserProfile.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const tests = dirname(fileURLToPath(import.meta.url))
const browser =
  process.env.EIDA_TEST_BROWSER ??
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
if (!existsSync(browser) || typeof WebSocket === 'undefined')
  throw new Error(
    'Requires Edge and node --experimental-websocket. No browser was installed.',
  )
// Marked temporary directory (browser profile + test page) from browserProfile.mjs: removed in `finally`
// and, through the shared handlers, on SIGINT/SIGTERM or 'exit'.
const temporaryProfile = await createBrowserProfile('offline-indexeddb')
const temporary = realpathSync(temporaryProfile.dir)
const profile = join(temporary, 'profile')
mkdirSync(profile)
const modules = new Map()
function bundle(filename) {
  filename = resolve(filename)
  if (modules.has(filename)) return modules.get(filename).id
  const item = { id: modules.size, code: '', dependencies: {} }
  modules.set(filename, item)
  item.code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText
  for (const match of item.code.matchAll(/require\(["']([^"']+)["']\)/g)) {
    if (!match[1].startsWith('.'))
      throw new Error(
        'The browser storage test must not require external modules.',
      )
    item.dependencies[match[1]] = bundle(
      resolve(dirname(filename), match[1] + '.ts'),
    )
  }
  return item.id
}
const entry = bundle(join(tests, 'storage.browser.ts'))
const code = `const modules = {${[...modules.values()].map((item) => `${item.id}: [(require,module,exports)=>{${item.code}\n},${JSON.stringify(item.dependencies)}]`).join(',')}};
const loaded = {}; function load(id) { if (loaded[id]) return loaded[id].exports; const module = loaded[id] = {exports:{}}; modules[id][0](name=>load(modules[id][1][name]),module,module.exports); return module.exports; }
load(${entry}); window.__eidaStorageTestReady = true;`
const html = readFileSync(join(tests, 'storage.browser.html'), 'utf8').replace(
  /<script type="module"[^>]+><\/script>/,
  `<script>${code}</script>`,
)
const pagePath = join(temporary, 'storage-check.html')
writeFileSync(pagePath, html)
const processHandle = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
)
trackBrowser(temporaryProfile, processHandle)
const sleep = (delay) => new Promise((done) => setTimeout(done, delay))
async function until(action, message) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const value = await action()
    if (value) return value
    await sleep(100)
  }
  throw new Error(message)
}
let socket
let send
try {
  const activePort = join(profile, 'DevToolsActivePort')
  await until(
    () => existsSync(activePort),
    'Browser did not start its isolated debugging port.',
  )
  const [port, endpoint] = readFileSync(activePort, 'utf8')
    .trim()
    .split(/\r?\n/)
  socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`)
  await new Promise((done, reject) => {
    socket.addEventListener('open', done, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let sequence = 0
  const pending = new Map()
  const listeners = new Set()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const callback = pending.get(message.id)
      if (callback) {
        pending.delete(message.id)
        callback(message)
      }
    } else for (const listener of listeners) listener(message)
  })
  send = (method, params = {}, sessionId) =>
    new Promise((done, reject) => {
      const id = ++sequence
      const timeout = setTimeout(() => {
        pending.delete(id)
        reject(new Error('CDP timeout: ' + method))
      }, 15000)
      pending.set(id, (message) => {
        clearTimeout(timeout)
        if (message.error) reject(new Error(message.error.message))
        else done(message.result)
      })
      socket.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      )
    })
  const version = await send('Browser.getVersion')
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', {
    targetId,
    flatten: true,
  })
  await send('Page.enable', {}, sessionId)
  const evaluate = async (expression) => {
    const result = await send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    )
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  async function navigation(action) {
    const loaded = new Promise((done, reject) => {
      const timeout = setTimeout(() => {
        listeners.delete(listener)
        reject(new Error('Browser page load timed out.'))
      }, 15000)
      const listener = (message) => {
        if (
          message.sessionId === sessionId &&
          message.method === 'Page.loadEventFired'
        ) {
          clearTimeout(timeout)
          listeners.delete(listener)
          done()
        }
      }
      listeners.add(listener)
    })
    await action()
    await loaded
    if (!(await evaluate('window.__eidaStorageTestReady === true')))
      throw new Error('Storage test script did not initialize.')
  }
  await navigation(() =>
    send('Page.navigate', { url: pathToFileURL(pagePath).href }, sessionId),
  )
  await evaluate("document.getElementById('create').click()")
  const readOutput = async () => {
    const text = await evaluate("document.getElementById('output').textContent")
    if (text.includes('ERROR:')) throw new Error(text)
    return text
  }
  await until(
    async () => (await readOutput()).includes('Ahora recarga'),
    'IndexedDB transaction checks did not finish.',
  )
  await navigation(() => send('Page.reload', {}, sessionId))
  await evaluate("document.getElementById('verify').click()")
  const result = await until(async () => {
    const text = await readOutput()
    return text.includes('Se eliminaron únicamente') ? text : null
  }, 'Reload persistence checks did not finish.')
  console.log(
    `PASS: real IndexedDB, unique concurrent capture, account guard, terminal results, full page reload and controlled cleanup (${version.product}).`,
  )
  console.log(result.trim())
} finally {
  if (send && socket?.readyState === WebSocket.OPEN)
    await send('Browser.close').catch(() => {})
  socket?.close()
  await until(
    () => processHandle.exitCode !== null,
    'Isolated browser did not close.',
  ).catch(() => {})
  // Stops this run's browser tree if it is still running and removes only its marked directory.
  await cleanupBrowserProfile(temporaryProfile, processHandle)
}
