export function packageFixture() {
  return {
    package_id: '1ba37ca3-1c61-4ed0-8740-a53776bb4d90',
    exam_id: 42,
    list_id: 8,
    version: 1,
    responsible_id: 7,
    prepared_at: '2027-01-15T13:30:00.000000Z',
    expires_at: '2027-01-15T15:00:00.000000Z',
    timezone: 'America/La_Paz',
    room_id: 3,
    surname_range: { from: 'García', to: 'García' },
    qr_validation: 'SERVER_ON_SYNC',
    exam: {
      id: 42,
      name: 'Primer parcial',
      subject_name: 'Programación I',
      exam_date: '2027-01-15',
      start_time: '10:00:00',
      duration_minutes: 60,
      status: 'SCHEDULED',
      server_time: '2027-01-15T13:30:00.000000Z',
      entry_opens_at: '2027-01-15T14:00:00.000000Z',
      entry_closes_at: '2027-01-15T15:00:00.000000Z',
      room: { id: 3, code: 'A-101', name: 'Aula 101', location: null },
    },
    students: [
      {
        student_id: 101,
        first_names: 'Luis',
        last_names: 'García',
        sis_code: '202600101',
        identity_number: '70000101',
        student_status: 'ACTIVE',
        enrollment_status: 'ACTIVE',
        eligibility_status: 'ELIGIBLE',
        eligibility_revision: 1,
        entry_status: 'PENDING',
      },
    ],
  }
}
export function distributionFixture() {
  const packet = packageFixture()
  return {
    exam_id: packet.exam_id,
    version: 1,
    prepared_at: packet.prepared_at,
    lists: [
      {
        list_id: packet.list_id,
        responsible_id: packet.responsible_id,
        responsible_name: 'Ana Pérez',
        student_count: 1,
        surname_range: packet.surname_range,
        students: [
          {
            list_id: 8,
            student_id: 101,
            first_names: 'Luis',
            last_names: 'García',
            sis_code: '202600101',
          },
        ],
      },
    ],
  }
}
export function localEntry(index = 0, overrides = {}) {
  return {
    key: `7:00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    ownerId: 7,
    examId: 42,
    packageId: packageFixture().package_id,
    listId: 8,
    version: 1,
    roomId: 3,
    status: 'PENDING',
    result: null,
    payload: {
      event_id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      student_id: 101 + index,
      method: 'MANUAL',
      captured_at: '2027-01-15T14:05:00.000Z',
    },
    ...overrides,
  }
}
