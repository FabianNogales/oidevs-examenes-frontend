export const exam = {
  id: 4,
  name: 'Primer parcial de Redes',
  exam_date: '2026-11-03',
  status: 'IN_PROGRESS',
  subject: { id: 2, code: 'RED-01', name: 'Redes de Computadoras' },
  academic_term: { id: 3, name: '2/2026' },
  permissions: {
    report_types: [
      'ENROLLED',
      'ATTENDANCE',
      'PENDING_ABSENT',
      'INCIDENTS',
      'DISCIPLINARY',
    ],
    formats: ['pdf', 'csv'],
  },
}
export const student = {
  id: 7,
  first_names: 'Ana',
  last_names: 'Prueba',
  sis_code: '00123',
  identity_number: '00099',
}
export const actor = { id: 2, name: 'Docente responsable' }
export const filters = { type: 'ENROLLED', date_from: '', date_to: '' }
export const row = {
  source_id: 7,
  record_type: 'ENROLLMENT',
  exam_id: 4,
  student,
  state: 'ENROLLED',
  category: null,
  description: null,
  occurred_at: null,
  method: null,
  origin: null,
  recorded_by: null,
  related_infraction_id: null,
}
export const catalog = {
  data: [exam],
  filters: { subjects: [exam.subject], academic_terms: [exam.academic_term] },
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
}
export function report(type = 'ENROLLED', rows = [row], options = {}) {
  return {
    exam,
    report: {
      id: 'snapshot-1',
      type,
      scope: 'EXAM',
      generated_at: '2026-11-03T14:00:00Z',
      source: 'SERVER',
      offline_pending_included: false,
      total_records: rows.length,
      total_participants: Math.max(
        1,
        new Set(rows.map((r) => r.student?.id).filter(Boolean)).size,
      ),
      pending_classification: type === 'PENDING_ABSENT' ? 'PENDING' : null,
      formats: ['pdf', 'csv'],
      filters: {
        exam_id: 4,
        subject_id: 2,
        academic_term_id: 3,
        date_from: null,
        date_to: null,
      },
      ...options,
    },
    data: rows,
    meta: { current_page: 1, last_page: 1, per_page: 10, total: rows.length },
  }
}
export const entry = {
  ...row,
  source_id: 9,
  record_type: 'ENTRY',
  state: 'VALID',
  occurred_at: '2026-11-03T13:50:00Z',
  method: 'QR',
  recorded_by: actor,
}
export const pending = { ...row, record_type: 'PENDING', state: 'PENDING' }
export const incident = {
  ...row,
  source_id: 10,
  record_type: 'INCIDENT',
  state: 'REGISTERED',
  student: null,
  category: 'WRONG_EXAM',
  description: 'QR de otro examen.',
  occurred_at: '2026-11-03T13:50:00Z',
  origin: 'AUTOMATIC',
  recorded_by: actor,
}
export const infraction = {
  ...row,
  source_id: 11,
  record_type: 'INFRACTION',
  state: 'REPORTED',
  category: 'COPYING',
  description: 'Uso de apuntes.',
  occurred_at: '2026-11-03T13:50:00Z',
  recorded_by: actor,
}
export const expulsion = {
  ...row,
  source_id: 11,
  record_type: 'EXPULSION',
  state: 'EXPELLED',
  description: 'Decisión justificada.',
  occurred_at: '2026-11-03T13:50:00Z',
  recorded_by: actor,
  related_infraction_id: 11,
}
