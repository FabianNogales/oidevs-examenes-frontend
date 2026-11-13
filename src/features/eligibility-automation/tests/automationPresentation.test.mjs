import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

const h = sourceHarness()
const ui = h.load(
  'features/eligibility-automation/utils/automationPresentation.ts',
)

test('history dates preserve instants across offsets and expose dates without a zone', () => {
  assert.equal(
    ui.evaluationDateLabel('2026-11-03T14:00:00Z'),
    ui.evaluationDateLabel('2026-11-03T10:00:00-04:00'),
  )
  assert.notEqual(
    ui.evaluationDateLabel('2026-11-03T14:00:00Z'),
    ui.evaluationDateLabel('2026-11-03T14:05:00Z'),
  )
  assert.equal(
    ui.evaluationDateLabel('2026-11-03T10:00:00'),
    '2026-11-03T10:00:00 (zona horaria no indicada)',
  )
})

test('missing fields prefer known assessment labels and preserve unknown paths', () => {
  assert.equal(
    ui.missingFieldLabel('assessments.FIRST_PARTIAL'),
    'Datos del primer parcial',
  )
  assert.equal(
    ui.missingFieldLabel('assessments.SECOND_PARTIAL'),
    'Datos del segundo parcial',
  )
  assert.equal(
    ui.missingFieldLabel('assessments.FIRST_PARTIAL', {
      FIRST_PARTIAL: 'Parcial institucional',
    }),
    'Datos del parcial institucional',
  )
  assert.equal(
    ui.missingFieldLabel('assessments.UNKNOWN'),
    'assessments.UNKNOWN',
  )
})

test('criterion field errors identify only the submitted criterion without compatibility rules', () => {
  const selected = [
    { code: 'MIN_ATTENDANCE_PERCENTAGE' },
    { code: 'MIN_ASSESSMENT_AVERAGE' },
  ]
  assert.equal(
    ui.criterionErrorCode('criteria.1.parameters.assessment_keys', selected),
    'MIN_ASSESSMENT_AVERAGE',
  )
  assert.equal(
    ui.criterionErrorCode('MIN_ATTENDANCE_PERCENTAGE', selected),
    'MIN_ATTENDANCE_PERCENTAGE',
  )
  assert.equal(ui.criterionErrorCode('revision', selected), null)
})

test('academic errors translate search validation and diagnostics omit message and values', () => {
  const error = Object.assign(new Error('The search field must be a string.'), {
    status: 422,
    code: null,
    fieldErrors: { search: 'The search field must be a string.' },
    query: 'sensitive',
  })
  assert.match(
    ui.academicLoadError(error, 'No se pudo consultar.'),
    /La búsqueda debe ser texto/,
  )
  assert.deepEqual(JSON.parse(ui.academicDiagnostic(error)), {
    status: 422,
    code: null,
    fields: ['search'],
  })
  assert.equal(
    ui.academicLoadError(
      new Error('SQLSTATE sensitive data'),
      'No se pudo consultar.',
    ),
    'No se pudo consultar.',
  )
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

test('presentation translates evaluation and combination values and preserves unknown values', () => {
  assert.equal(ui.evaluationTypeLabel('makeup'), 'Segunda instancia')
  assert.equal(ui.evaluationTypeLabel('OTHER_TYPE'), 'OTHER_TYPE')
  assert.equal(
    ui.combinationLabel('ALL'),
    'Deben cumplirse todos los criterios seleccionados',
  )
  assert.equal(
    ui.combinationLabel('ANY'),
    'Debe cumplirse al menos uno de los criterios seleccionados',
  )
  assert.equal(ui.combinationLabel('OTHER'), 'OTHER')
})

test('assessment labels do not fabricate missing information', () => {
  assert.equal(
    ui.assessmentLabel('FIRST_PARTIAL', 'Parcial institucional'),
    'Parcial institucional',
  )
  assert.equal(ui.assessmentLabel('SECOND_PARTIAL'), 'Segundo parcial')
  assert.equal(ui.assessmentLabel('UNKNOWN'), 'UNKNOWN')
})

test('academic history presents known actions and changes with human labels', () => {
  assert.equal(
    ui.academicActionLabel('ACADEMIC_RECORD_IMPORTED'),
    'Registro académico importado',
  )
  assert.equal(
    ui.academicActionLabel('ACADEMIC_RECORD_CORRECTED'),
    'Corrección de datos académicos',
  )
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
    reason:
      'Prueba HU34: corrección de notas y preservación de decisión manual',
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
      {
        assessment_key: 'FIRST_PARTIAL',
        score: null,
        was_taken: false,
        attended_classes: null,
        total_classes: null,
      },
      {
        assessment_key: 'FIRST_PARTIAL',
        score: 0,
        was_taken: true,
        attended_classes: 0,
        total_classes: 10,
      },
    ),
    [
      {
        label: 'Asistencia',
        oldValue: 'Sin dato / Sin dato',
        newValue: '0 / 10',
      },
      { label: 'Primer parcial · Nota', oldValue: 'Sin dato', newValue: '0' },
      {
        label: 'Primer parcial · Estado de evaluación',
        oldValue: 'No rindió',
        newValue: 'Rindió',
      },
    ],
  )
  assert.deepEqual(
    ui.academicHistoryChanges(
      { attended_classes: 18, total_classes: 20 },
      { attended_classes: 19 },
    ),
    [{ label: 'Asistencia', oldValue: '18 / 20', newValue: '19 / 20' }],
  )
  assert.deepEqual(
    ui.academicHistoryChanges(null, {
      preview_id: 'preview-1',
      record_ids: [5],
      created_records: 1,
      student_id: 14,
      errors: 6,
      total_rows: 6,
    }),
    [],
  )
})

// HU34 estabilización (H3/H5): fixtures con la forma real del backend 7779b48.
test('score labels distinguish missing, not taken, taken without score and zero', () => {
  assert.equal(ui.academicScoreLabel(undefined), 'Sin registro')
  assert.equal(ui.academicScoreLabel(null), 'Sin registro')
  assert.equal(
    ui.academicScoreLabel({ was_taken: false, score: null }),
    'No rindió',
  )
  assert.equal(
    ui.academicScoreLabel({ was_taken: true, score: null }),
    'Rindió · sin nota',
  )
  assert.equal(ui.academicScoreLabel({ was_taken: true, score: 0 }), '0')
  assert.equal(ui.academicScoreLabel({ was_taken: true, score: 70.5 }), '70.5')
})

test('only academic record events identify a student', () => {
  assert.equal(ui.isAcademicRecordEvent('AcademicRecord'), true)
  assert.equal(ui.isAcademicRecordEvent('academic_record'), true)
  assert.equal(ui.isAcademicRecordEvent('CourseOffering'), false)
  assert.equal(ui.isAcademicRecordEvent(''), false)
})

test('history summaries use real action labels and server counters only', () => {
  const summary = (action, new_values) =>
    ui.academicHistorySummary({ action, new_values })
  assert.deepEqual(
    summary('ACADEMIC_IMPORT_PREVIEWED', {
      mode: 'MERGE',
      errors: 1,
      preview_id: '28baa75d-bc3d-4a1c-a243-d00b4499a2c3',
      total_rows: 1,
    }),
    {
      title: 'Vista previa de importación',
      lead: 'Importación parcial (MERGE) · 1 fila · 1 con errores',
    },
  )
  assert.deepEqual(
    summary('ACADEMIC_IMPORT_PREVIEWED', { errors: 0, total_rows: 5 }),
    { title: 'Vista previa de importación', lead: '5 filas · 0 con errores' },
  )
  // A confirmation that created nothing never reads as "1 record created".
  assert.deepEqual(
    summary('ACADEMIC_IMPORT_CONFIRMED', {
      mode: 'MERGE',
      record_ids: [5],
      created_records: 0,
      updated_records: 1,
      unchanged_records: 0,
    }),
    {
      title: 'Importación confirmada',
      lead: 'Importación parcial (MERGE) · Creados: 0 · Actualizados: 1 · Sin cambios: 0',
    },
  )
  assert.deepEqual(
    summary('ACADEMIC_IMPORT_CONFIRMED', {
      record_ids: [1, 2, 3, 4, 5],
      created_records: 5,
    }),
    { title: 'Importación confirmada', lead: 'Creados: 5' },
  )
  // Missing counters are omitted instead of defaulting to 1.
  assert.deepEqual(summary('ACADEMIC_IMPORT_CONFIRMED', {}), {
    title: 'Importación confirmada',
    lead: null,
  })
  assert.deepEqual(summary('ACADEMIC_IMPORT_CONFIRMED', null), {
    title: 'Importación confirmada',
    lead: null,
  })
  assert.deepEqual(summary('ACADEMIC_RECORD_IMPORTED', { student_id: 4 }), {
    title: 'Registro académico creado',
    lead: null,
  })
  assert.deepEqual(
    summary('ACADEMIC_RECORD_IMPORTED', { student_id: 8, mode: 'MERGE' }),
    {
      title: 'Registro académico creado',
      lead: 'Alta por importación parcial (MERGE)',
    },
  )
  assert.deepEqual(
    summary('ACADEMIC_RECORD_CORRECTED', { student_id: 6, mode: 'MERGE' }),
    {
      title: 'Actualización por importación parcial (MERGE)',
      lead: '1 registro académico actualizado',
    },
  )
  assert.deepEqual(summary('ACADEMIC_RECORD_CORRECTED', { student_id: 8 }), {
    title: 'Corrección de datos académicos',
    lead: '1 registro académico actualizado',
  })
  assert.deepEqual(summary('UNKNOWN_ACTION', { created_records: 3 }), {
    title: 'Actividad académica',
    lead: null,
  })
})

test('a created record shows no previous value instead of repeating the new one', () => {
  const created = {
    id: 9,
    mode: 'MERGE',
    revision: 1,
    student_id: 8,
    updated_by: 2,
    assessments: {},
    total_classes: 20,
    attended_classes: 10,
    correction_reason: '',
    course_offering_id: 1,
  }
  assert.deepEqual(ui.academicHistoryChanges(null, created), [
    { label: 'Asistencia', oldValue: 'Sin dato', newValue: '10 / 20' },
  ])
  assert.deepEqual(
    ui.academicHistoryChanges(null, {
      ...created,
      assessments: { FIRST_PARTIAL: { score: 0, was_taken: true } },
      attended_classes: 0,
    }),
    [
      { label: 'Asistencia', oldValue: 'Sin dato', newValue: '0 / 20' },
      { label: 'Primer parcial · Nota', oldValue: 'Sin dato', newValue: '0' },
      {
        label: 'Primer parcial · Estado de evaluación',
        oldValue: 'Sin dato',
        newValue: 'Rindió',
      },
    ],
  )
  // An attendance-only correction still compares both real values.
  assert.deepEqual(
    ui.academicHistoryChanges(
      { ...created, correction_reason: undefined },
      { ...created, revision: 2, attended_classes: 0 },
    ),
    [{ label: 'Asistencia', oldValue: '10 / 20', newValue: '0 / 20' }],
  )
})

test('history reason reads correction_reason as audited by the backend', () => {
  assert.equal(
    ui.academicHistoryReason(
      { attended_classes: 10 },
      { attended_classes: 0, correction_reason: 'Corrección de asistencia' },
    ),
    'Corrección de asistencia',
  )
  assert.equal(
    ui.academicHistoryReason(null, { mode: 'MERGE', correction_reason: '' }),
    null,
  )
  assert.equal(
    ui.academicHistoryReason(
      { reason: 'Anterior' },
      { reason: 'Nuevo', correction_reason: 'Otro' },
    ),
    'Nuevo',
  )
  assert.equal(ui.academicHistoryReason(null, null), null)
})
test('an assessment added without a score does not report an identical score change', () => {
  // Real event 99: MERGE adds a taken assessment whose score is still missing.
  assert.deepEqual(
    ui.academicHistoryChanges(
      { student_id: 7, assessments: {}, attended_classes: 0, total_classes: 20 },
      {
        student_id: 7,
        mode: 'MERGE',
        assessments: { FIRST_PARTIAL: { score: null, was_taken: true } },
        attended_classes: 0,
        total_classes: 20,
      },
    ),
    [
      {
        label: 'Primer parcial · Estado de evaluación',
        oldValue: 'Sin dato',
        newValue: 'Rindió',
      },
    ],
  )
})