import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

function setup(importer) {
  const Dropzone = () => null
  const h = sourceHarness({
    '@/features/subjects/components/import/SubjectCsvDropzone': { SubjectCsvDropzone: Dropzone },
    '@/features/course-offerings/hooks/useOfferingNavigationGuard': { useOfferingNavigationGuard: () => false },
    '../api/teacherStudentsApi': { importStudentsCsv: importer },
    './EnrollmentImportReport': { EnrollmentImportReport: () => null },
  })
  const { EnrollmentImportPanel } = h.load('features/students/components/EnrollmentImportPanel.tsx')
  let tree = h.render(() => EnrollmentImportPanel({ offeringId: '37', onReturn() {} }))
  const render = () => tree = h.render()
  const button = (name) => nodes(tree, n => n.type === 'button' && textContent(n) === name)[0]
  const select = () => { nodes(tree, n => n.type === Dropzone)[0].props.onSelect({ name: 'students.csv', size: 25 }); render() }
  return { select, render, button }
}
const summary = { validCount: 1, duplicateCount: 0, errorCount: 0, importedStudents: [], issues: [] }

test('enrollment CSV validates without persistence, confirms once and retains the offering', async () => {
  const calls = []
  let resolve
  const t = setup((...args) => { calls.push(args); return new Promise(done => { resolve = done }) })
  t.select()
  const validate = t.button('Validar y continuar')
  validate.props.onClick(); validate.props.onClick()
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], '37')
  assert.equal(calls[0][2], true)
  resolve(summary); await settle(); t.render()
  const confirm = t.button('Confirmar importación')
  confirm.props.onClick(); confirm.props.onClick()
  assert.equal(calls.length, 2)
  assert.equal(calls[1][2], false)
  resolve(summary); await settle(); t.render()
  assert.equal(t.button('Confirmar importación'), undefined)
  assert.ok(t.button('Ver estudiantes inscritos'))
})

test('enrollment CSV prevents confirmation when all rows are invalid or duplicates', async () => {
  const t = setup(async () => ({ ...summary, validCount: 0, duplicateCount: 1 }))
  t.select(); t.button('Validar y continuar').props.onClick()
  await settle(); t.render()
  assert.equal(t.button('Confirmar importación').props.disabled, true)
})

test('enrollment CSV does not offer a second confirmation after an uncertain response', async () => {
  let calls = 0
  const t = setup(async (_offering, _file, preview) => {
    calls++
    if (!preview) throw new Error('Conexión interrumpida')
    return summary
  })
  t.select(); t.button('Validar y continuar').props.onClick()
  await settle(); t.render()
  t.button('Confirmar importación').props.onClick()
  await settle(); t.render()
  assert.equal(calls, 2)
  assert.equal(t.button('Confirmar importación'), undefined)
  assert.ok(t.button('Ver estudiantes inscritos'))
})
