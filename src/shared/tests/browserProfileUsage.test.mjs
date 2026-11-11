// Regressions for the temporary-profile clean-up (maintenance 2026-11-08): browser QA scripts must use the
// shared browserProfile helper, interrupted runs clean only their own profiles, the sweep is conservative
// and the evidence retention report never deletes anything.
import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PROFILE_MARKER,
  activeProfiles,
  cleanupActiveProfilesSync,
  cleanupBrowserProfile,
  createBrowserProfile,
} from './browserProfile.mjs'
import { inspectProfiles, sweepProfiles } from './sweepBrowserProfiles.mjs'
import { retentionReport } from './validationRetention.mjs'

const srcRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(`${signal} handler in a child process removes its registered profile`, async () => {
    const helper = new URL('./browserProfile.mjs', import.meta.url).href
    const source = `import {createBrowserProfile} from ${JSON.stringify(helper)};
      const profile = await createBrowserProfile('signal-test');
      console.log(profile.dir);
      process.emit(${JSON.stringify(signal)}, ${JSON.stringify(signal)});`
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], { windowsHide: true })
    let output = '', errors = ''
    child.stdout.on('data', (chunk) => { output += chunk })
    child.stderr.on('data', (chunk) => { errors += chunk })
    const code = await new Promise((done, reject) => {
      child.once('error', reject)
      child.once('exit', done)
    })
    assert.equal(code, signal === 'SIGINT' ? 130 : 143, errors)
    assert.match(errors, new RegExp(signal + ': limpiando'))
    assert.equal(existsSync(output.trim()), false, output)
  })
}

function browserScripts() {
  return readdirSync(srcRoot, { recursive: true })
    .map((file) => String(file).replaceAll('\\', '/'))
    .filter((file) => file.endsWith('.browser.mjs') || file === 'shared/tests/browserHarness.mjs')
}

test('browser QA scripts create temporary directories only through browserProfile.mjs', () => {
  const scripts = browserScripts()
  assert.ok(scripts.length >= 30, `se esperaban los scripts de navegador (${scripts.length})`)
  const offenders = []
  for (const file of scripts) {
    const source = readFileSync(join(srcRoot, file), 'utf8')
    if (/\bmkdtemp\s*\(/.test(source)) offenders.push(`${file}: mkdtemp`)
    if (/\btmpdir\s*\(\s*\)/.test(source)) offenders.push(`${file}: tmpdir()`)
    // Chrome must be stopped by cleanupBrowserProfile (process tree + profile removal), never a bare kill.
    if (/\b(chrome|browser)\??\.kill\s*\(/.test(source)) offenders.push(`${file}: kill() directo`)
    if (source.includes('--user-data-dir') && file !== 'shared/tests/browserHarness.mjs' && !/\bcreateBrowserProfile\b/.test(source))
      offenders.push(`${file}: lanza Chrome sin createBrowserProfile`)
    if (/\bcreateBrowserProfile\b/.test(source) && !/\bcleanupBrowserProfile\b/.test(source))
      offenders.push(`${file}: crea un perfil sin cleanupBrowserProfile`)
  }
  assert.deepEqual(offenders, [])
  const harness = readFileSync(join(srcRoot, 'shared/tests/browserHarness.mjs'), 'utf8')
  assert.match(harness, /profile = await createBrowserProfile\(name\)/)
  assert.match(harness, /await cleanupBrowserProfile\(profile, chrome\)/)
})

async function sandbox(run) {
  const root = await mkdtemp(join(tmpdir(), 'eida-sandbox-usage-'))
  try {
    await run(root)
  } finally {
    cleanupActiveProfilesSync({ find: () => [], stop: () => {} })
    await rm(root, { recursive: true, force: true })
  }
}

test('interrupted runs clean only their registered profiles and stop only the Chrome using them', async () => {
  await sandbox(async (root) => {
    const own = await createBrowserProfile('usage-own', { root })
    const foreign = join(root, 'eida-foreign-run')
    await mkdir(foreign)
    assert.ok(activeProfiles().some((profile) => profile.dir === own.dir))
    const stopped = []
    const removed = cleanupActiveProfilesSync({
      find: (dir) => (dir === own.dir ? [4242] : [9999]),
      stop: (pid) => stopped.push(pid),
    })
    assert.deepEqual(removed, [own.dir])
    assert.deepEqual(stopped, [4242], 'solo el Chrome lanzado con este perfil')
    assert.equal(existsSync(own.dir), false)
    assert.equal(existsSync(foreign), true, 'un directorio ajeno no se toca')
    assert.equal(activeProfiles().some((profile) => profile.dir === own.dir), false)
  })
})

test('cleanupBrowserProfile unregisters the profile it removes', async () => {
  await sandbox(async (root) => {
    const profile = await createBrowserProfile('usage-cleanup', { root })
    assert.deepEqual(await cleanupBrowserProfile(profile, undefined), { removed: true })
    assert.equal(existsSync(profile.dir), false)
    assert.equal(activeProfiles().some((item) => item.dir === profile.dir), false)
  })
})

test('the sweep is read-only by default and removes only orphaned, old, marked profiles', async () => {
  await sandbox(async (root) => {
    const now = Date.parse('2026-11-08T20:00:00Z')
    const old = '2026-11-07T10:00:00Z'
    const make = async (name, marker) => {
      const dir = join(root, name)
      await mkdir(dir)
      if (marker) await writeFile(join(dir, PROFILE_MARKER), JSON.stringify(marker))
      return dir
    }
    await make('eida-orphan-a1', { token: 't1', pid: 101, createdAt: old })
    await make('eida-alive-a2', { token: 't2', pid: 202, createdAt: old })
    await make('eida-recent-a3', { token: 't3', pid: 303, createdAt: '2026-11-08T19:30:00Z' })
    await make('eida-inuse-a4', { token: 't4', pid: 404, createdAt: old })
    await make('eida-nomarker-a5', null)
    await make('hu30-browser-a6', null)
    await make('unrelated-folder', null)
    const results = await inspectProfiles({
      root, now, minAgeMs: 3600000,
      isAlive: (pid) => pid === 202,
      inUse: (dir) => dir.endsWith('eida-inuse-a4'),
      measure: async () => 1,
    })
    const byName = Object.fromEntries(results.map((result) => [result.name, result]))
    assert.equal(byName['unrelated-folder'], undefined)
    assert.deepEqual(results.filter((result) => result.eligible).map((result) => result.name), ['eida-orphan-a1'])
    assert.match(byName['eida-alive-a2'].reason, /activo/)
    assert.match(byName['eida-recent-a3'].reason, /reciente/)
    assert.match(byName['eida-inuse-a4'].reason, /Chrome/)
    assert.match(byName['eida-nomarker-a5'].reason, /sin marcador/)
    assert.match(byName['hu30-browser-a6'].reason, /legado/)
    // Inspection alone deletes nothing.
    assert.equal(readdirSync(root).length, 7)
    const unavailable = await inspectProfiles({ root, now, minAgeMs: 3600000, isAlive: () => false, inUse: () => { throw new Error('CIM denied') }, measure: async () => 0 })
    assert.equal(unavailable.some((row) => row.eligible), false, 'sin inspección no se autoriza borrar')
    assert.deepEqual(await sweepProfiles(results, { root, isAlive: () => true, inUse: () => false }), [], 'el propietario se revalida antes de borrar')
    assert.deepEqual(await sweepProfiles(results, { root, isAlive: () => false, inUse: () => true }), [], 'el navegador se revalida antes de borrar')
    assert.deepEqual(await sweepProfiles(results, { root, isAlive: () => false, inUse: () => false }), ['eida-orphan-a1'])
    assert.deepEqual(readdirSync(root).sort(), ['eida-alive-a2', 'eida-inuse-a4', 'eida-nomarker-a5', 'eida-recent-a3', 'hu30-browser-a6', 'unrelated-folder'])
  })
})

test('the evidence retention report flags old folders and never deletes them', async () => {
  await sandbox(async (root) => {
    const evidence = join(root, '.validation.local')
    await mkdir(join(evidence, 'old-run'), { recursive: true })
    await mkdir(join(evidence, 'new-run'), { recursive: true })
    await writeFile(join(evidence, 'old-run', 'a.png'), 'x'.repeat(10))
    await writeFile(join(evidence, 'new-run', 'b.png'), 'y'.repeat(5))
    const tenDaysAgo = new Date(Date.parse('2026-11-08T12:00:00Z') - 10 * 86400000)
    await utimes(join(evidence, 'old-run', 'a.png'), tenDaysAgo, tenDaysAgo)
    await utimes(join(evidence, 'new-run', 'b.png'), new Date('2026-11-08T11:00:00Z'), new Date('2026-11-08T11:00:00Z'))
    const rows = await retentionReport({ root: evidence, now: Date.parse('2026-11-08T12:00:00Z'), days: 7 })
    assert.deepEqual(rows.map((row) => [row.name, row.old, row.files, row.bytes]), [['old-run', true, 1, 10], ['new-run', false, 1, 5]])
    assert.equal(existsSync(join(evidence, 'old-run', 'a.png')), true)
  })
})
