import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const h = sourceHarness()
const csv = h.load('features/exam-reports/utils/csvExportFormat.ts')

test('BUG 08: prepends UTF-8 BOM, enforces RFC 4180 quoting and separates metadata from tabular data', () => {
  const raw = [
    'ID Reporte,snapshot-1',
    'Examen,Primer Parcial: Cálculo I',
    'Fecha UTC,2026-11-03T14:00:00Z',
    'SIS,Estudiante,Estado,Observación',
    '202600001,Peña, José,Presente,Ingresó "temprano"',
  ].join('\n')

  const formatted = csv.formatExamReportCsv(raw)
  assert.ok(formatted.startsWith('\uFEFF'), 'includes UTF-8 BOM for Excel')
  const lines = formatted.slice(1).split('\r\n')
  assert.equal(lines[0], 'ID Reporte,snapshot-1')
  assert.equal(lines[1], 'Examen,Primer Parcial: Cálculo I')
  assert.equal(lines[2], 'Fecha UTC,2026-11-03T14:00:00Z')
  assert.equal(lines[3], '', 'inserts blank row between metadata and headers')
  assert.equal(lines[4], 'SIS,Estudiante,Estado,Observación')
})

test('BUG 08: quotes fields containing commas, quotes, semicolons or outer whitespace without duplicating blank lines', () => {
  const raw = [
    'Reporte,"Asistencia, Oficial"',
    '',
    'SIS,Nombre,Nota',
    '001,"García, María","Con ""comillas"""',
    '002,Luis; Pérez, 90 ',
  ].join('\n')

  const formatted = csv.formatExamReportCsv(raw)
  assert.ok(formatted.startsWith('\uFEFF'))
  assert.equal(
    formatted.slice(1),
    [
      'Reporte,"Asistencia, Oficial"',
      '',
      'SIS,Nombre,Nota',
      '001,"García, María","Con ""comillas"""',
      '002,"Luis; Pérez"," 90 "',
      '',
    ].join('\r\n'),
  )
})

test('BUG 08: normalizeExamReportCsvBlob returns UTF-8 CSV blob with single BOM', async () => {
  const input = new Blob(['\uFEFFSIS,Nombre\n001,Ñandú'], { type: 'text/csv' })
  const output = await csv.normalizeExamReportCsvBlob(input)
  assert.equal(output.type, 'text/csv;charset=utf-8;')
  const bytes = new Uint8Array(await output.arrayBuffer())
  assert.deepEqual(Array.from(bytes.slice(0, 3)), [0xef, 0xbb, 0xbf])
  assert.notEqual(bytes[3], 0xef, 'does not double-prepend BOM')
  const decoded = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
  assert.equal(decoded, '\uFEFFSIS,Nombre\r\n001,Ñandú\r\n')
})
