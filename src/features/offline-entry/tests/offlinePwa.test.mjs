import test from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const { offlineWorkerSource, offlinePwaPlugin } = sourceHarness().load(
  '../build/offlinePwa.ts',
)

test('PWA plugin emits a versioned worker covering build chunks, fonts and shell without running an app build', () => {
  const emitted = []
  const plugin = offlinePwaPlugin()
  plugin.configResolved({
    base: '/',
    publicDir: fileURLToPath(new URL('../../../../public', import.meta.url)),
  })
  const bundle = {
    main: {
      type: 'chunk',
      fileName: 'assets/main.js',
      code: 'application-code',
    },
    lazy: {
      type: 'chunk',
      fileName: 'assets/offline.js',
      code: 'offline-code',
    },
    font: {
      type: 'asset',
      fileName: 'assets/poppins.woff2',
      source: new Uint8Array([1, 2]),
    },
    index: { type: 'asset', fileName: 'index.html', source: '<html></html>' },
  }
  plugin.generateBundle.handler.call(
    { emitFile: (file) => emitted.push(file) },
    {},
    bundle,
  )
  assert.equal(emitted[0].fileName, 'offline-sw.js')
  for (const url of [
    '/assets/main.js',
    '/assets/offline.js',
    '/assets/poppins.woff2',
    '/index.html',
    '/manifest.webmanifest',
  ])
    assert.ok(emitted[0].source.includes(url))
  bundle.main.code = 'changed-application-code'
  plugin.generateBundle.handler.call(
    { emitFile: (file) => emitted.push(file) },
    {},
    bundle,
  )
  const cacheName = (file) => file.source.match(/const CACHE = "([^"]+)"/)[1]
  assert.notEqual(cacheName(emitted[0]), cacheName(emitted[1]))
  assert.throws(
    () =>
      offlinePwaPlugin().configResolved({
        base: '/another-app/',
        publicDir: '',
      }),
    /root-path/,
  )
})
function worker() {
  const handlers = {}
  const requests = []
  const matches = []
  const deleted = []
  const cache = {
    addAll: async (values) => requests.push(...values),
    match: async (value) => {
      matches.push(value)
      return { source: 'cached' }
    },
  }
  const self = {
    location: { origin: 'https://eida.test' },
    clients: { claim: async () => {} },
    addEventListener: (name, handler) => {
      handlers[name] = handler
    },
  }
  const source = offlineWorkerSource(
    ['/index.html', '/assets/main.js', '/assets/main.css'],
    'eida-offline-shell-test',
    '/',
  )
  runInNewContext(source, {
    self,
    caches: {
      open: async () => cache,
      keys: async () => [
        'eida-offline-shell-old',
        'unrelated-cache',
        'eida-offline-shell-test',
      ],
      delete: async (key) => deleted.push(key),
    },
    URL,
    Request: class {
      constructor(url, options) {
        this.url = url
        this.credentials = options.credentials
      }
    },
    fetch: async () => ({ source: 'network' }),
  })
  return { handlers, requests, matches, deleted, source }
}
test('PWA precaches static resources without credentials', async () => {
  const item = worker()
  let promise
  item.handlers.install({
    waitUntil: (value) => {
      promise = value
    },
  })
  await promise
  assert.equal(item.requests.length, 3)
  assert.ok(item.requests.every((request) => request.credentials === 'omit'))
})
test('PWA serves an offline shell only for its hub and exam control routes', async () => {
  const item = worker()
  for (const path of [
    '/offline',
    '/exams/42/offline?view=control',
    '/exams/42/offline?view=sync',
  ]) {
    let promise
    item.handlers.fetch({
      request: {
        url: `https://eida.test${path}`,
        method: 'GET',
        mode: 'navigate',
      },
      respondWith: (value) => {
        promise = value
      },
    })
    assert.equal((await promise).source, 'cached')
  }
  assert.ok(item.matches.every((match) => match === '/index.html'))
})
test('PWA never handles authenticated APIs, auth, photos, POST, external resources or unrelated routes', () => {
  const item = worker()
  for (const request of [
    { url: 'https://eida.test/backend/api/v1/me', method: 'GET' },
    { url: 'https://eida.test/api/v1/exams/42/offline/package', method: 'GET' },
    { url: 'https://eida.test/login', method: 'POST' },
    { url: 'https://eida.test/storage/private-photo.jpg', method: 'GET' },
    { url: 'https://external.test/assets/main.js', method: 'GET' },
    { url: 'https://eida.test/teacher/exams', method: 'GET', mode: 'navigate' },
  ])
    item.handlers.fetch({
      request,
      respondWith: () =>
        assert.fail('Private/unrelated request was intercepted'),
    })
  assert.deepEqual(item.matches, [])
})
test('PWA verifies actual shell entries and cleans only its cache namespace without forcing updates', async () => {
  const item = worker()
  let activation
  let message
  let result
  item.handlers.activate({
    waitUntil: (value) => {
      activation = value
    },
  })
  await activation
  assert.deepEqual(item.deleted, ['eida-offline-shell-old'])
  item.handlers.message({
    data: { type: 'EIDA_VERIFY_SHELL' },
    ports: [
      {
        postMessage: (value) => {
          result = value
        },
      },
    ],
    waitUntil: (value) => {
      message = value
    },
  })
  await message
  assert.equal(result.ready, true)
  assert.equal(result.type, 'EIDA_SHELL_STATUS')
  assert.ok(!item.source.includes('skipWaiting'))
})
