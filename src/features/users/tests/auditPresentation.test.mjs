import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const { auditActionLabel, auditEntityLabel, auditContextRows } = sourceHarness().load('features/users/utils/auditPresentation.ts')
test('BUG01: audit actions and related records use readable labels', () => {
  assert.equal(auditActionLabel('ADMIN_ACCESS_GRANTED'), 'Acceso administrativo autorizado')
  assert.equal(auditActionLabel('EXAM_COLLABORATOR_REVOKED'), 'Colaborador del examen: revocación')
  assert.equal(auditActionLabel('READ'), 'Consulta de información')
  assert.equal(auditEntityLabel('Exam'), 'Examen')
  assert.equal(auditActionLabel('NEW_INTERNAL_EVENT'), 'Actividad registrada')
})
test('BUG02: contexts explain fields and values without losing before/after evidence', () => {
  assert.deepEqual(auditContextRows({ status: 'INACTIVE', history_complete: false, summary: { successfulRecords: 0 }, exam_id: 7 }), [
    { label: 'Estado', value: 'Inactivo' }, { label: 'Historial completo', value: 'No' },
    { label: 'Resumen · Registros correctos', value: '0' }, { label: 'Examen (ID)', value: '7' },
  ])
  assert.deepEqual(auditContextRows([]), [])
  assert.deepEqual(auditContextRows({ name: '<script>alert(1)</script>' }), [{ label: 'Nombre', value: '<script>alert(1)</script>' }])
})
