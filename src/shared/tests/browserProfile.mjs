// Temporary Chrome profiles for the *.browser.mjs QA scripts.
//
// Each run creates its own directory inside os.tmpdir() with an ownership
// marker (random token). Cleanup only ever touches that exact directory: it
// never scans or removes profiles from other runs. It stops the Chrome started
// by this run (on Windows its whole process tree), waits for it to exit and only
// then removes the directory with limited retries. If Chrome cannot be confirmed
// as stopped, or the path/marker checks fail, the profile is kept and a warning
// is printed. Cleanup never throws, so the original test error is preserved.
//
// Usage (call cleanup from `finally`):
//   let browserProfile, chrome
//   try {
//     browserProfile = await createBrowserProfile('confirm-escape')
//     chrome = spawn(chromePath, [`--user-data-dir=${browserProfile.dir}`, ...])
//     ...
//   } finally {
//     await cleanupBrowserProfile(browserProfile, chrome)
//   }
//
// Interruptions (maintenance 2026-11-08): every profile created here is registered until its cleanup.
// On SIGINT/SIGTERM (Ctrl+C) the registered profiles are cleaned before the process exits, and the
// 'exit' event removes whatever is left synchronously. Only the Chrome launched with that exact
// --user-data-dir is stopped (trackBrowser() or a command-line lookup of the unique directory); other
// Chrome processes are never touched. A forced termination from outside (TerminateProcess, `timeout`)
// runs no handler: sweepBrowserProfiles.mjs reports and, with explicit opt-in, removes those leftovers.
import { execFile, execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync, rmSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'

export const PROFILE_PREFIX = 'eida-'
export const PROFILE_MARKER = '.eida-profile.json'

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Creates a unique, marked profile directory for this run. */
export async function createBrowserProfile(name, { root = tmpdir() } = {}) {
  if (!NAME.test(name)) throw new Error(`Invalid browser profile name: ${name}`)
  const base = resolve(root)
  const dir = await mkdtemp(join(base, `${PROFILE_PREFIX}${name}-`))
  const token = randomUUID()
  await writeFile(
    join(dir, PROFILE_MARKER),
    JSON.stringify({
      token,
      name,
      pid: process.pid,
      createdAt: new Date().toISOString(),
    }),
  )
  const profile = Object.freeze({ dir, token, root: base, name })
  registerActiveProfile(profile)
  return profile
}

// --- Active profiles and interruption handling -------------------------------------------------------

const active = new Map() // profile.dir -> { profile, chrome }
let handlersInstalled = false

function registerActiveProfile(profile) {
  active.set(profile.dir, { profile, chrome: null })
  installInterruptionHandlers()
}

/** Associates the Chrome child process launched with this profile (optional, faster cleanup). */
export function trackBrowser(profile, chrome) {
  const entry = profile && active.get(profile.dir)
  if (entry) entry.chrome = chrome
  return chrome
}

/** Profiles created by this process and not cleaned up yet (read-only copy). */
export function activeProfiles() {
  return [...active.values()].map((entry) => entry.profile)
}

/**
 * PIDs of processes whose command line contains this exact --user-data-dir (Windows only).
 * The directory is a unique mkdtemp path, so no foreign Chrome can match.
 */
export function findChromeUsingProfile(dir, { run = execFileSync } = {}) {
  if (process.platform !== 'win32') return []
  const needle = `--user-data-dir=${dir}`.replaceAll("'", "''")
  try {
    const output = run(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command',
        `$ErrorActionPreference='Stop'; Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -and ($_.CommandLine.Contains('${needle}"') -or $_.CommandLine.Contains('${needle} ') -or $_.CommandLine.EndsWith('${needle}')) } | ForEach-Object { $_.ProcessId }`],
      { encoding: 'utf8', windowsHide: true, timeout: 15000 },
    )
    return String(output).split(/\s+/).map(Number).filter((pid) => Number.isSafeInteger(pid) && pid > 0)
  } catch (error) {
    throw new Error('No se pudo comprobar si el navegador usa el perfil', { cause: error })
  }
}

function ownsProfileDir(profile) {
  if (!isInsideRoot(profile.dir, profile.root)) return false
  try {
    return JSON.parse(readFileSync(join(profile.dir, PROFILE_MARKER), 'utf8'))?.token === profile.token
  } catch {
    return false
  }
}

function stopTreeSync(pid) {
  try {
    if (process.platform === 'win32')
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 15000 })
    else process.kill(pid, 'SIGKILL')
  } catch {
    // Already gone.
  }
}

/**
 * Synchronous best-effort cleanup of every registered profile (used on 'exit' and after signals).
 * Never throws. Returns the directories that were removed.
 */
export function cleanupActiveProfilesSync({ find = findChromeUsingProfile, stop = stopTreeSync, remove = (dir) => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } = {}) {
  const removed = []
  for (const [dir, { profile, chrome }] of [...active]) {
    try {
      const pids = new Set(find(dir))
      if (running(chrome) && chrome.pid) pids.add(chrome.pid)
      for (const pid of pids) stop(pid)
      if (ownsProfileDir(profile)) {
        remove(dir)
        removed.push(dir)
      }
    } catch {
      // Keep going: the sweep script reports anything left behind.
    }
    active.delete(dir)
  }
  return removed
}

function installInterruptionHandlers() {
  if (handlersInstalled) return
  handlersInstalled = true
  const onSignal = (signal) => {
    if (active.size) console.warn(`[browserProfile] ${signal}: limpiando ${active.size} perfil(es) temporal(es)`)
    cleanupActiveProfilesSync()
    process.exit(signal === 'SIGINT' ? 130 : 143)
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)
  process.once('exit', () => {
    if (active.size) cleanupActiveProfilesSync()
  })
}

/** True when `dir` is a direct child of `root` named with the EIDA prefix. */
export function isInsideRoot(dir, root) {
  const rel = relative(resolve(root), resolve(dir))
  return (
    rel !== '' &&
    !rel.startsWith('..') &&
    !isAbsolute(rel) &&
    !rel.includes('/') &&
    !rel.includes('\\') &&
    basename(dir).startsWith(PROFILE_PREFIX)
  )
}

const running = (child) =>
  Boolean(child) && child.exitCode === null && child.signalCode === null

function defaultKillTree(child) {
  if (process.platform === 'win32' && child.pid) {
    // /T terminates only the tree rooted at this run's Chrome PID.
    return new Promise((done) => {
      execFile(
        'taskkill',
        ['/PID', String(child.pid), '/T', '/F'],
        { windowsHide: true },
        () => done(),
      )
    })
  }
  child.kill('SIGKILL')
  return Promise.resolve()
}

function waitForExit(child, timeoutMs) {
  if (!running(child)) return Promise.resolve(true)
  return new Promise((done) => {
    const timer = setTimeout(() => {
      child.off?.('exit', onExit)
      done(!running(child))
    }, timeoutMs)
    const onExit = () => {
      clearTimeout(timer)
      done(true)
    }
    child.once('exit', onExit)
  })
}

/**
 * Stops this run's Chrome and removes its profile. Never throws.
 * Resolves to { removed: boolean, reason?: string }.
 */
export async function cleanupBrowserProfile(
  profile,
  chrome,
  {
    timeoutMs = 5000,
    killTree = defaultKillTree,
    removeDir = (dir) =>
      rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }),
    warn = (message) => console.warn(`[browserProfile] ${message}`),
  } = {},
) {
  if (!profile) return { removed: false, reason: 'no-profile' }
  const result = await cleanupProfile(profile, chrome, { timeoutMs, killTree, removeDir, warn })
  active.delete(profile.dir)
  return result
}

async function cleanupProfile(profile, chrome, { timeoutMs, killTree, removeDir, warn }) {
  const keep = (reason, detail) => {
    warn(`perfil conservado (${reason}): ${profile.dir}${detail ? ` — ${detail}` : ''}`)
    return { removed: false, reason }
  }
  try {
    if (running(chrome)) {
      try {
        await killTree(chrome)
      } catch (error) {
        // Still wait below: the process may have exited anyway.
        warn(`no se pudo terminar Chrome (${error?.message ?? error})`)
      }
      if (!(await waitForExit(chrome, timeoutMs)))
        return keep('chrome-activo', `PID ${chrome.pid} sigue en ejecución`)
    }
    if (!isInsideRoot(profile.dir, profile.root))
      return keep('ruta-ajena')
    let marker
    try {
      marker = JSON.parse(await readFile(join(profile.dir, PROFILE_MARKER), 'utf8'))
    } catch {
      return keep('sin-marcador')
    }
    if (marker?.token !== profile.token) return keep('marcador-ajeno')
    try {
      await removeDir(profile.dir)
    } catch (error) {
      return keep('borrado-fallido', error?.code ?? error?.message)
    }
    return { removed: true }
  } catch (error) {
    return keep('error-inesperado', error?.message)
  }
}
