// Retention report for local QA evidence (.validation.local) — maintenance 2026-11-08.
// Read-only: it never deletes anything. It lists each evidence folder with its size, number of files
// and age, and flags the ones older than the threshold (default 7 days) as candidates for a manual,
// authorised clean-up.
//
//   node src/shared/tests/validationRetention.mjs              # threshold 7 days
//   node src/shared/tests/validationRetention.mjs --days=14
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

async function folderStats(dir) {
  let bytes = 0, files = 0, newest = 0
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      const inner = await folderStats(path)
      bytes += inner.bytes
      files += inner.files
      newest = Math.max(newest, inner.newest)
    } else {
      const info = await stat(path).catch(() => null)
      if (!info) continue
      bytes += info.size
      files += 1
      newest = Math.max(newest, info.mtimeMs)
    }
  }
  return { bytes, files, newest }
}

/** Evidence folders with size, files and age (from their newest file). */
export async function retentionReport({ root = join(process.cwd(), '.validation.local'), now = Date.now(), days = 7 } = {}) {
  const rows = []
  for (const entry of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory()) continue
    const info = await folderStats(join(root, entry.name))
    const ageDays = info.newest ? Math.floor((now - info.newest) / 86400000) : null
    rows.push({ name: entry.name, bytes: info.bytes, files: info.files, ageDays, old: ageDays !== null && ageDays >= days })
  }
  return rows.sort((a, b) => b.bytes - a.bytes)
}

async function main() {
  const arg = process.argv.slice(2).find((value) => value.startsWith('--days='))
  const days = arg ? Number(arg.split('=')[1]) : 7
  if (!Number.isFinite(days) || days < 1) throw new Error('--days debe ser un número ≥ 1')
  const rows = await retentionReport({ days })
  const mb = (bytes) => (bytes / 1048576).toFixed(1)
  for (const row of rows)
    console.log(`${row.old ? 'ANTIGUA' : 'reciente'}  ${mb(row.bytes).padStart(7)} MB  ${String(row.files).padStart(5)} archivos  ${String(row.ageDays ?? '-').padStart(3)} días  ${row.name}`)
  const old = rows.filter((row) => row.old)
  const total = (list) => mb(list.reduce((sum, row) => sum + row.bytes, 0))
  console.log(`\n${rows.length} carpetas (${total(rows)} MB); con ${days} días o más: ${old.length} (${total(old)} MB). Informe de solo lectura: no se ha borrado nada.`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()
