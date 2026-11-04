import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const h = sourceHarness()
const ui = h.load(
  'features/eligibility-automation/utils/automationPresentation.ts',
)

test('history dates preserve instants across offsets and expose dates without a zone', () => {
  assert.equal(ui.evaluationDateLabel('2026-11-03T14:00:00Z'), ui.evaluationDateLabel('2026-11-03T10:00:00-04:00'))
  assert.notEqual(ui.evaluationDateLabel('2026-11-03T14:00:00Z'), ui.evaluationDateLabel('2026-11-03T14:05:00Z'))
  assert.equal(ui.evaluationDateLabel('2026-11-03T10:00:00'), '2026-11-03T10:00:00 (zona horaria no indicada)')
})

test('missing fields prefer known assessment labels and preserve unknown paths', () => {
  assert.equal(ui.missingFieldLabel('assessments.FIRST_PARTIAL'), 'Datos del primer parcial')
  assert.equal(ui.missingFieldLabel('assessments.SECOND_PARTIAL'), 'Datos del segundo parcial')
  assert.equal(ui.missingFieldLabel('assessments.FIRST_PARTIAL', { FIRST_PARTIAL: 'Parcial institucional' }), 'Datos del parcial institucional')
  assert.equal(ui.missingFieldLabel('assessments.UNKNOWN'), 'assessments.UNKNOWN')
})

test('criterion field errors identify only the submitted criterion without compatibility rules', () => {
  const selected = [{ code: 'MIN_ATTENDANCE_PERCENTAGE' }, { code: 'MIN_ASSESSMENT_AVERAGE' }]
  assert.equal(ui.criterionErrorCode('criteria.1.parameters.assessment_keys', selected), 'MIN_ASSESSMENT_AVERAGE')
  assert.equal(ui.criterionErrorCode('MIN_ATTENDANCE_PERCENTAGE', selected), 'MIN_ATTENDANCE_PERCENTAGE')
  assert.equal(ui.criterionErrorCode('revision', selected), null)
})

test('academic errors translate search validation and diagnostics omit message and values', () => {
  const error = Object.assign(new Error('The search field must be a string.'), { status: 422, code: null, fieldErrors: { search: 'The search field must be a string.' }, query: 'sensitive' })
  assert.match(ui.academicLoadError(error, 'No se pudo consultar.'), /La búsqueda debe ser texto/)
  assert.deepEqual(JSON.parse(ui.academicDiagnostic(error)), { status: 422, code: null, fields: ['search'] })
  assert.equal(ui.academicLoadError(new Error('SQLSTATE sensitive data'), 'No se pudo consultar.'), 'No se pudo consultar.')
})

test('presentation prefers backend labels and uses Spanish only for known criterion codes', () => {
  assert.equal(
    ui.criterionLabel('MIN_ATTENDANCE_PERCENTAGE', 'Asistencia institucional'),
    'Asistencia institucional',
  )
  assert.equal(
    ui.criterionLabel('MIN_ASSESSMENT_SCORE'),
    'Nota mínima por evaluación',
  )
  assert.equal(ui.criterionLabel('UNKNOWN_CODE'), 'UNKNOWN_CODE')
  assert.equal(ui.parameterLabel('minimum_average'), 'Promedio mínimo')
  assert.equal(ui.parameterLabel('unknown_parameter'), 'unknown_parameter')
})

test('condition presentation uses the supplied operator/threshold, including zero, without a fixed academic rule', () => {
  assert.equal(ui.conditionLabel('GT', 37.5), 'Mayor que 37.5')
  assert.equal(ui.conditionLabel('GTE', 0), 'Mayor o igual que 0')
  assert.equal(ui.conditionLabel('EQ', 12), 'Igual a 12')
  assert.equal(ui.conditionLabel('UNKNOWN_OPERATOR', 42), 'UNKNOWN_OPERATOR 42')
  assert.equal(ui.conditionLabel(undefined, undefined), '— —')
})

test('presentation translates known evaluation/combination/status values and preserves unknown values', () => {
  assert.equal(ui.evaluationTypeLabel('makeup'), 'Segunda instancia')
  assert.equal(ui.evaluationTypeLabel('OTHER_TYPE'), 'OTHER_TYPE')
  assert.equal(
    ui.combinationLabel('ALL'),
    'Deben cumplirse todos los criterios seleccionados',
  )
  assert.equal(ui.combinationLabel('OTHER'), 'OTHER')
  assert.equal(ui.policyStatusLabel('DRAFT'), 'Borrador')
  assert.equal(ui.policyStatusLabel('ACTIVE'), 'Activa')
  assert.equal(ui.policyStatusLabel('OTHER'), 'OTHER')
})

test('assessment labels and activation dates do not fabricate missing information', () => {
  assert.equal(
    ui.assessmentLabel('FIRST_PARTIAL', 'Parcial institucional'),
    'Parcial institucional',
  )
  assert.equal(ui.assessmentLabel('SECOND_PARTIAL'), 'Segundo parcial')
  assert.equal(ui.assessmentLabel('UNKNOWN'), 'UNKNOWN')
  assert.equal(ui.activationLabel(null), 'No activada')
  assert.equal(ui.activationLabel('raw invalid date'), 'raw invalid date')
  assert.ok(ui.activationLabel('2026-11-03T10:00:00-04:00').includes('2026'))
})

test('academic history presents known actions and changes with human labels', () => {
  assert.equal(ui.academicActionLabel('ACADEMIC_RECORD_IMPORTED'), 'Registro académico importado')
  assert.equal(ui.academicActionLabel('ACADEMIC_RECORD_CORRECTED'), 'Corrección de datos académicos')
  assert.equal(ui.academicActionLabel('UNKNOWN_ACTION'), 'Actividad académica')
  const oldValues = {
    student_id: 14,
    assessments: {
      FIRST_PARTIAL: { was_taken: true, score: 25 },
      SECOND_PARTIAL: { was_taken: true, score: 25 },
    },
    attended_classes: 18,
    total_classes: 20,
    reason: 'Motivo anterior',
  }
  const newValues = {
    student_id: 14,
    assessments: {
      FIRST_PARTIAL: { was_taken: true, score: 30 },
      SECOND_PARTIAL: { was_taken: true, score: 30 },
    },
    attended_classes: 18,
    total_classes: 20,
    reason: 'Prueba HU34: corrección de notas y preservación de decisión manual',
  }
  assert.deepEqual(ui.academicHistoryChanges(oldValues, newValues), [
    { label: 'Primer parcial · Nota', oldValue: '25', newValue: '30' },
    { label: 'Segundo parcial · Nota', oldValue: '25', newValue: '30' },
  ])
  assert.equal(
    ui.academicHistoryReason(oldValues, newValues),
    'Prueba HU34: corrección de notas y preservación de decisión manual',
  )
  assert.deepEqual(
    ui.academicHistoryChanges(
      { assessment_key: 'FIRST_PARTIAL', score: null, was_taken: false, attended_classes: null, total_classes: null },
      { assessment_key: 'FIRST_PARTIAL', score: 0, was_taken: true, attended_classes: 0, total_classes: 10 },
    ),
    [
      { label: 'Asistencia', oldValue: 'Sin dato / Sin dato', newValue: '0 / 10' },
      { label: 'Primer parcial · Nota', oldValue: 'Sin dato', newValue: '0' },
      { label: 'Primer parcial · Estado de evaluación', oldValue: 'No rindió', newValue: 'Rindió' },
    ],
  )
  assert.deepEqual(
    ui.academicHistoryChanges(
      { attended_classes: 18, total_classes: 20 },
      { attended_classes: 19 },
    ),
    [{ label: 'Asistencia', oldValue: '18 / 20', newValue: '19 / 20' }],
  )
})
