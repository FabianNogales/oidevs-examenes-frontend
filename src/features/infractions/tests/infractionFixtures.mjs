export const exam = { id: 4, name: 'Primer parcial', subject_name: 'Redes' }
export const student = {
  id: 7,
  first_names: 'Ana',
  last_names: 'Prueba',
  sis_code: '00123',
  identity_number: '00099',
}
export const record = {
  id: 9,
  exam_id: 4,
  student,
  type: 'COPYING',
  description: 'Se observó uso de apuntes.',
  observations: 'Revisar con el estudiante.',
  status: 'REPORTED',
  occurred_at: '2026-11-03T14:00:00Z',
  updated_at: '2026-11-03T14:00:00Z',
  reported_by: { id: 2, name: 'Docente responsable' },
  permissions: {
    can_update: true,
    allowed_statuses: ['CONFIRMED', 'RESOLVED'],
  },
}
export const created = {
  id: 1,
  action: 'CREATED',
  from_status: null,
  to_status: 'REPORTED',
  reason: null,
  performed_by: record.reported_by,
  performed_at: record.occurred_at,
}
export const detail = { exam, data: record, history: [created] }
export const confirmed = {
  exam,
  data: {
    ...record,
    status: 'CONFIRMED',
    updated_at: '2026-11-03T14:10:00Z',
    permissions: { can_update: true, allowed_statuses: ['RESOLVED'] },
  },
  history: [
    created,
    {
      id: 2,
      action: 'STATUS_CHANGED',
      from_status: 'REPORTED',
      to_status: 'CONFIRMED',
      reason: 'Se revisó la evidencia.',
      performed_by: record.reported_by,
      performed_at: '2026-11-03T14:10:00Z',
    },
  ],
}
export const meta = { current_page: 1, last_page: 1, per_page: 10, total: 1 }
