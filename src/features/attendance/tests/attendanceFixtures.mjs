export const summary = {
  total_students: 3,
  registered: 1,
  pending: 2,
  attendance_percentage: 33.33,
}
export const base = {
  exam: { id: 4, name: 'Primer parcial de Redes', status: 'IN_PROGRESS' },
  summary,
  roster_scope: 'ACTIVE_ENROLLMENTS',
  source: 'SERVER',
  is_current: true,
  poll_after_seconds: 5,
  last_updated_at: '2026-11-03T14:00:00Z',
  offline: {
    available_on_server: false,
    pending_count: null,
    included_in_official_attendance: false,
  },
  exclusive_lists: {
    available: false,
    reason: 'EXCLUSIVE_LISTS_NOT_CONFIGURED',
  },
}
export const student = {
  student_id: 7,
  first_names: 'Ana',
  last_names: 'Prueba',
  sis_code: '00123',
  identity_number: '00099',
  student_status: 'ACTIVE',
  attendance_status: 'SERVER_CONFIRMED',
  entry: {
    id: 9,
    entered_at: '2026-11-03T13:50:00Z',
    verified_by: 2,
    verification_method: 'QR',
  },
}
export const pending = {
  ...student,
  student_id: 8,
  first_names: 'Bruno',
  sis_code: '00124',
  attendance_status: 'PENDING',
  entry: null,
}
export const page = {
  ...base,
  data: [
    student,
    pending,
    { ...pending, student_id: 9, first_names: 'Carla', sis_code: '00125' },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 3 },
}
export const query = { view: 'all', search: '', page: 1 }
export const activity = {
  ...base,
  collaborators: {
    available: true,
    metric: 'VALID_ENTRIES_VERIFIED_BY_USER',
    progress_by_assigned_list_available: false,
    data: [
      {
        user_id: 2,
        name: 'Docente responsable',
        role: 'RESPONSIBLE_TEACHER',
        assignment_status: null,
        valid_registered: 1,
        assigned_total: null,
        pending: null,
        attendance_percentage: null,
      },
    ],
  },
}
export const list = {
  id: 12,
  name: 'Lista A–M',
  collaborator: { id: 2, name: 'Docente responsable' },
  ...summary,
}
