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
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
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
  return Object.freeze({ dir, token, root: base, name })
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
