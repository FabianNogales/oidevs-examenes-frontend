// Leftover temporary Chrome profiles of the browser QA scripts (maintenance 2026-11-08).
//
// Read-only by default: it lists every profile-like directory in os.tmpdir() and explains why each one
// would be kept or could be removed. Removal requires the explicit `--delete` flag and, for each
// directory, ALL of: the `eida-` prefix directly inside the root, a valid browserProfile marker, a dead
// owner process (marker pid), a minimum age (default 24h, `--min-age-hours=N`) and no Chrome process
// using it. Legacy directories without a marker (hu*-browser-*, hu34-ui-*) are only reported.
//
//   node src/shared/tests/sweepBrowserProfiles.mjs                       # report
//   node src/shared/tests/sweepBrowserProfiles.mjs --delete              # remove eligible ones
//   node src/shared/tests/sweepBrowserProfiles.mjs --delete --min-age-hours=6
import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROFILE_MARKER, PROFILE_PREFIX, findChromeUsingProfile, isInsideRoot } from './browserProfile.mjs'

const LEGACY = /^(hu\d+-browser-|hu34-ui-)/

/** True while a process with this pid exists (EPERM: it exists but belongs to someone else). */
export function isProcessAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

async function directorySize(dir) {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) total += await directorySize(path)
    else total += (await stat(path).catch(() => ({ size: 0 }))).size
  }
  return total
}

/** Classifies every profile-like directory in `root`. Never modifies anything. */
export async function inspectProfiles({
  root = tmpdir(),
  now = Date.now(),
  minAgeMs = 24 * 3600 * 1000,
  isAlive = isProcessAlive,
  inUse = (dir) => findChromeUsingProfile(dir).length > 0,
  measure = directorySize,
} = {}) {
  const base = resolve(root)
  const entries = await readdir(base, { withFileTypes: true }).catch(() => [])
  const results = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const legacy = LEGACY.test(entry.name)
    if (!entry.name.startsWith(PROFILE_PREFIX) && !legacy) continue
    const dir = join(base, entry.name)
    const result = { name: entry.name, dir, bytes: await measure(dir), eligible: false, reason: '' }
    results.push(result)
    if (legacy) {
      result.reason = 'legado sin marcador: revisar manualmente'
      continue
    }
    if (!isInsideRoot(dir, base)) {
      result.reason = 'ruta ajena'
      continue
    }
    let marker
    try {
      marker = JSON.parse(await readFile(join(dir, PROFILE_MARKER), 'utf8'))
    } catch {
      result.reason = 'sin marcador de browserProfile'
      continue
    }
    const created = Date.parse(marker?.createdAt)
    if (typeof marker?.token !== 'string' || !Number.isSafeInteger(marker?.pid) || !Number.isFinite(created)) {
      result.reason = 'marcador no válido'
      continue
    }
    result.pid = marker.pid
    result.ageHours = Math.round(((now - created) / 3600000) * 10) / 10
    if (isAlive(marker.pid)) result.reason = `proceso ${marker.pid} activo`
    else if (now - created < minAgeMs) result.reason = 'demasiado reciente'
    else {
      try {
        if (inUse(dir)) result.reason = 'Chrome lo está usando'
        else {
          result.eligible = true
          result.token = marker.token
          result.reason = 'huérfano: marcador válido, proceso inactivo y antigüedad mínima'
        }
      } catch {
        result.reason = 'no se pudo comprobar el navegador: conservar'
      }
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name))
}

/** Removes only the eligible directories of an inspection (re-checking path and marker first). */
export async function sweepProfiles(results, { root = tmpdir(), isAlive = isProcessAlive, inUse = (dir) => findChromeUsingProfile(dir).length > 0, remove = (dir) => rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } = {}) {
  const removed = []
  for (const result of results) {
    if (!result.eligible || !isInsideRoot(result.dir, resolve(root))) continue
    try {
      const marker = JSON.parse(await readFile(join(result.dir, PROFILE_MARKER), 'utf8'))
      if (marker.token !== result.token || marker.pid !== result.pid || isAlive(marker.pid) || inUse(result.dir)) continue
      await remove(result.dir)
      removed.push(result.name)
    } catch {
      // Marker vanished or the directory is locked: keep it.
    }
  }
  return removed
}

async function main() {
  const args = process.argv.slice(2)
  const remove = args.includes('--delete')
  const hoursArg = args.find((arg) => arg.startsWith('--min-age-hours='))
  const hours = hoursArg ? Number(hoursArg.split('=')[1]) : 24
  if (!Number.isFinite(hours) || hours < 1) throw new Error('--min-age-hours debe ser un número ≥ 1')
  const results = await inspectProfiles({ minAgeMs: hours * 3600 * 1000 })
  const mb = (bytes) => (bytes / 1048576).toFixed(1)
  for (const result of results)
    console.log(`${result.eligible ? 'ELIMINABLE' : 'CONSERVAR '}  ${mb(result.bytes).padStart(7)} MB  ${result.name}  — ${result.reason}`)
  const eligible = results.filter((result) => result.eligible)
  const total = (list) => mb(list.reduce((sum, result) => sum + result.bytes, 0))
  console.log(`\n${results.length} carpetas (${total(results)} MB); eliminables: ${eligible.length} (${total(eligible)} MB); antigüedad mínima ${hours} h.`)
  if (!remove) {
    console.log('Modo informe: no se ha borrado nada. Usa --delete para eliminar solo las marcadas como ELIMINABLE.')
    return
  }
  const removed = await sweepProfiles(results)
  console.log(`Eliminadas: ${removed.length} de ${eligible.length}.`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
