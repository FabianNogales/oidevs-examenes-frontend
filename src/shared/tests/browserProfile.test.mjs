import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  PROFILE_MARKER,
  cleanupBrowserProfile,
  createBrowserProfile,
  isInsideRoot,
} from './browserProfile.mjs'

// Every test works inside its own sandbox root, never in the real %TEMP% listing.
async function sandbox() {
  const root = await mkdtemp(join(tmpdir(), 'browser-profile-test-'))
  return {
    root,
    dispose: () => rm(root, { recursive: true, force: true }),
  }
}

const exists = (path) =>
  stat(path).then(
    () => true,
    () => false,
  )

// Simulated Chrome child process.
function fakeChrome({ exitsOnKill = true } = {}) {
  const child = new EventEmitter()
  child.pid = 4242
  child.exitCode = null
  child.signalCode = null
  child.exit = () => {
    child.exitCode = 0
    child.emit('exit', 0, null)
  }
  child.killTree = async () => {
    child.killed = (child.killed ?? 0) + 1
    if (exitsOnKill) setImmediate(child.exit)
  }
  return child
}

const quiet = () => {
  const messages = []
  return { warn: (message) => messages.push(message), messages }
}

test('creates a unique marked profile inside the root and rejects invalid names', async () => {
  const box = await sandbox()
  try {
    const first = await createBrowserProfile('confirm-escape', { root: box.root })
    const second = await createBrowserProfile('confirm-escape', { root: box.root })
    assert.notEqual(first.dir, second.dir)
    assert.notEqual(first.token, second.token)
    assert.ok(isInsideRoot(first.dir, box.root))
    assert.match(first.dir, /eida-confirm-escape-/)
    assert.ok(await exists(join(first.dir, PROFILE_MARKER)))
    await assert.rejects(createBrowserProfile('../escape', { root: box.root }))
    await assert.rejects(createBrowserProfile('Upper Case', { root: box.root }))
  } finally {
    await box.dispose()
  }
})

test('removes the profile after a successful run, waiting for this Chrome to exit first', async () => {
  const box = await sandbox()
  try {
    const profile = await createBrowserProfile('ok', { root: box.root })
    await writeFile(join(profile.dir, 'Local State'), '{}')
    const chrome = fakeChrome()
    const order = []
    const result = await cleanupBrowserProfile(profile, chrome, {
      killTree: async (child) => {
        order.push('kill')
        await chrome.killTree(child)
      },
      removeDir: async (dir) => {
        order.push(chrome.exitCode === null ? 'rm-before-exit' : 'rm-after-exit')
        await rm(dir, { recursive: true, force: true })
      },
      ...quiet(),
    })
    assert.deepEqual(result, { removed: true })
    assert.deepEqual(order, ['kill', 'rm-after-exit'])
    assert.equal(await exists(profile.dir), false)
  } finally {
    await box.dispose()
  }
})

test('removes the profile when the test body throws, and the original error is preserved', async () => {
  const box = await sandbox()
  let profile
  const original = new Error('assertion failed in the scenario')
  try {
    await assert.rejects(
      (async () => {
        let chrome
        try {
          profile = await createBrowserProfile('failing', { root: box.root })
          chrome = fakeChrome()
          throw original
        } finally {
          const result = await cleanupBrowserProfile(profile, chrome, {
            killTree: (child) => child.killTree(),
            ...quiet(),
          })
          assert.equal(result.removed, true)
        }
      })(),
      (error) => error === original,
    )
    assert.equal(await exists(profile.dir), false)
  } finally {
    await box.dispose()
  }
})

test('only removes its own profile: other runs (concurrent or old) are untouched', async () => {
  const box = await sandbox()
  try {
    const mine = await createBrowserProfile('mine', { root: box.root })
    const concurrent = await createBrowserProfile('mine', { root: box.root })
    const old = join(box.root, 'eida-old-run-abc123')
    await mkdir(old)
    await writeFile(join(old, 'Local State'), '{}')
    const foreign = join(box.root, 'not-a-profile')
    await mkdir(foreign)
    const result = await cleanupBrowserProfile(mine, undefined, quiet())
    assert.equal(result.removed, true)
    assert.equal(await exists(mine.dir), false)
    assert.equal(await exists(concurrent.dir), true, 'concurrent run kept')
    assert.equal(await exists(old), true, 'old profile kept')
    assert.equal(await exists(foreign), true, 'unrelated folder kept')
    assert.deepEqual(
      (await readdir(box.root)).sort(),
      [concurrent.dir.split(/[\\/]/).pop(), 'eida-old-run-abc123', 'not-a-profile'].sort(),
    )
  } finally {
    await box.dispose()
  }
})

test('keeps the profile and warns when Chrome is still running after the timeout', async () => {
  const box = await sandbox()
  try {
    const profile = await createBrowserProfile('busy', { root: box.root })
    const chrome = fakeChrome({ exitsOnKill: false })
    const log = quiet()
    let removeCalls = 0
    const result = await cleanupBrowserProfile(profile, chrome, {
      timeoutMs: 50,
      killTree: (child) => child.killTree(),
      removeDir: async () => {
        removeCalls++
      },
      warn: log.warn,
    })
    assert.deepEqual(result, { removed: false, reason: 'chrome-activo' })
    assert.equal(chrome.killed, 1, 'only this Chrome was signalled')
    assert.equal(removeCalls, 0, 'nothing removed while in use')
    assert.equal(await exists(profile.dir), true)
    assert.match(log.messages[0], /chrome-activo/)
  } finally {
    await box.dispose()
  }
})

test('refuses paths outside the root, without the EIDA prefix, without a marker or with a foreign marker', async () => {
  const box = await sandbox()
  const outside = await sandbox()
  try {
    const removeDir = async () => {
      throw new Error('must not be called')
    }
    const cases = []
    // Outside the declared root.
    const elsewhere = await createBrowserProfile('elsewhere', { root: outside.root })
    cases.push([{ ...elsewhere, root: box.root }, 'ruta-ajena'])
    // Nested deeper than a direct child of the root.
    const nested = join(box.root, 'eida-parent-x', 'eida-child-y')
    await mkdir(nested, { recursive: true })
    cases.push([{ dir: nested, root: box.root, token: 't' }, 'ruta-ajena'])
    // Direct child without the EIDA prefix.
    const plain = join(box.root, 'plain-folder')
    await mkdir(plain)
    cases.push([{ dir: plain, root: box.root, token: 't' }, 'ruta-ajena'])
    // Correct place but no marker.
    const unmarked = join(box.root, 'eida-unmarked-1')
    await mkdir(unmarked)
    cases.push([{ dir: unmarked, root: box.root, token: 't' }, 'sin-marcador'])
    // Marker from another run.
    const other = await createBrowserProfile('other', { root: box.root })
    cases.push([{ ...other, token: 'not-the-owner' }, 'marcador-ajeno'])
    for (const [profile, reason] of cases) {
      const result = await cleanupBrowserProfile(profile, undefined, {
        removeDir,
        ...quiet(),
      })
      assert.deepEqual(result, { removed: false, reason }, profile.dir)
      assert.equal(await exists(profile.dir), true)
    }
    assert.equal(await exists(join(outside.root, elsewhere.dir.split(/[\\/]/).pop())), true)
  } finally {
    await box.dispose()
    await outside.dispose()
  }
})

test('cleanup failures never throw: the profile is kept and a warning is printed', async () => {
  const box = await sandbox()
  try {
    const profile = await createBrowserProfile('locked', { root: box.root })
    const log = quiet()
    const busy = Object.assign(new Error('resource busy or locked'), { code: 'EBUSY' })
    const result = await cleanupBrowserProfile(profile, undefined, {
      removeDir: async () => {
        throw busy
      },
      warn: log.warn,
    })
    assert.deepEqual(result, { removed: false, reason: 'borrado-fallido' })
    assert.match(log.messages[0], /EBUSY/)
    assert.equal(await exists(profile.dir), true)

    // A failing kill is reported but the process exit is still awaited.
    const chrome = fakeChrome()
    const second = await createBrowserProfile('kill-error', { root: box.root })
    const result2 = await cleanupBrowserProfile(second, chrome, {
      timeoutMs: 200,
      killTree: async () => {
        setImmediate(chrome.exit)
        throw new Error('taskkill failed')
      },
      warn: log.warn,
    })
    assert.equal(result2.removed, true)
    assert.ok(log.messages.some((message) => /taskkill failed/.test(message)))

    // Nothing to clean.
    assert.deepEqual(await cleanupBrowserProfile(undefined, undefined, quiet()), {
      removed: false,
      reason: 'no-profile',
    })
  } finally {
    await box.dispose()
  }
})

test('an already exited Chrome is not signalled again', async () => {
  const box = await sandbox()
  try {
    const profile = await createBrowserProfile('exited', { root: box.root })
    const chrome = fakeChrome()
    chrome.exitCode = 0
    let kills = 0
    const result = await cleanupBrowserProfile(profile, chrome, {
      killTree: async () => {
        kills++
      },
      ...quiet(),
    })
    assert.equal(result.removed, true)
    assert.equal(kills, 0)
  } finally {
    await box.dispose()
  }
})
