import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compile } from '../../../shared/tests/sourceHarness.mjs'

function shell({ stalledRegistration = false, cached = true } = {}) {
  const timers = new Map()
  let timer = 0
  let channel
  const worker = {
    postMessage: () =>
      queueMicrotask(() =>
        channel.port1.onmessage({
          data: { type: 'EIDA_SHELL_STATUS', ready: cached },
        }),
      ),
  }
  class Channel {
    constructor() {
      channel = this
      this.port1 = { onmessage: null, close: () => {} }
      this.port2 = {}
    }
  }
  const navigator = {
    serviceWorker: {
      register: () =>
        stalledRegistration
          ? new Promise(() => {})
          : Promise.resolve({ active: worker }),
      ready: Promise.resolve({ active: worker }),
    },
  }
  const window = {
    isSecureContext: true,
    setTimeout: (callback) => {
      timers.set(++timer, callback)
      return timer
    },
    clearTimeout: (id) => timers.delete(id),
  }
  const source = readFileSync(
    new URL('../services/offlinePwa.ts', import.meta.url),
    'utf8',
  )
    .replaceAll('import.meta.env.PROD', 'true')
    .replaceAll('import.meta.env.BASE_URL', "'/'")
  const module = { exports: {} }
  new Function(
    'require',
    'module',
    'exports',
    'navigator',
    'window',
    'MessageChannel',
    compile(source),
  )(() => {}, module, module.exports, navigator, window, Channel)
  return {
    ...module.exports,
    expire: () => {
      for (const callback of [...timers.values()]) callback()
    },
  }
}
test('PWA readiness requires the real worker acknowledgement of a complete cache', async () => {
  assert.equal((await shell().verifyOfflineShell()).ready, true)
  assert.equal(
    (await shell({ cached: false }).verifyOfflineShell()).ready,
    false,
  )
})
test('PWA readiness has a deadline even if registration itself never resolves', async () => {
  const check = shell({ stalledRegistration: true })
  const pending = check.verifyOfflineShell()
  check.expire()
  const result = await pending
  assert.equal(result.ready, false)
  assert.match(result.message, /no se confirmó/)
})
