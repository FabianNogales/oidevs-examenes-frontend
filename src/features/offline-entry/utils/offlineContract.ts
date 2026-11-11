import type {
  AssignedStudent,
  OfflineDistribution,
  OfflinePackage,
  OfflineStudent,
  SurnameRange,
  SyncBatch,
  SyncResult,
  SyncStatus,
} from '../types/offline.types'

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Respuesta offline incompleta o inválida.')
  return value as Record<string, unknown>
}
const text = (value: unknown): string => {
  if (typeof value !== 'string')
    throw new Error('El servidor no proporcionó un texto válido.')
  return value
}
const nullableText = (value: unknown): string | null =>
  value === null ? null : text(value)
const id = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new Error('Identificador offline inválido.')
  return value
}
const instant = (value: unknown): string => {
  const result = text(value)
  if (
    !/(Z|[+-]\d{2}:\d{2})$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    throw new Error('Fecha offline inválida.')
  return result
}
const rows = (value: unknown): unknown[] => {
  if (!Array.isArray(value))
    throw new Error('La respuesta no contiene una lista válida.')
  return value
}
function unique(values: Array<string | number>) {
  if (new Set(values).size !== values.length)
    throw new Error('La respuesta contiene asignaciones duplicadas.')
}
const range = (value: unknown): SurnameRange => {
  const data = record(value)
  return { from: nullableText(data.from), to: nullableText(data.to) }
}
function student(value: unknown): AssignedStudent {
  const data = record(value)
  return {
    student_id: id(data.student_id),
    first_names: text(data.first_names),
    last_names: text(data.last_names),
    sis_code: text(data.sis_code),
  }
}
function packageStudent(value: unknown): OfflineStudent {
  const data = record(value)
  if (data.entry_status !== 'PENDING' && data.entry_status !== 'REGISTERED')
    throw new Error('Estado de ingreso desconocido.')
  return {
    ...student(data),
    identity_number: nullableText(data.identity_number),
    student_status: text(data.student_status),
    enrollment_status: nullableText(data.enrollment_status),
    eligibility_status: nullableText(data.eligibility_status),
    eligibility_revision:
      data.eligibility_revision === null ? null : id(data.eligibility_revision),
    entry_status: data.entry_status,
  }
}

export function parseDistribution(
  value: unknown,
  examId: number,
): OfflineDistribution {
  const data = record(value)
  if (id(data.exam_id) !== examId)
    throw new Error('La distribución pertenece a otro examen.')
  const lists = rows(data.lists).map((value) => {
    const row = record(value)
    const listId = id(row.list_id)
    const students = rows(row.students).map((value) => {
      if (record(value).list_id !== listId)
        throw new Error('Un estudiante pertenece a otra lista.')
      return student(value)
    })
    if (row.student_count !== students.length)
      throw new Error('El tamaño de la lista no coincide con sus estudiantes.')
    return {
      list_id: listId,
      responsible_id: id(row.responsible_id),
      responsible_name: nullableText(row.responsible_name),
      student_count: students.length,
      surname_range: range(row.surname_range),
      students,
    }
  })
  unique(lists.map((list) => list.list_id))
  unique(lists.map((list) => list.responsible_id))
  unique(lists.flatMap((list) => list.students.map((row) => row.student_id)))
  return {
    exam_id: examId,
    version: id(data.version),
    prepared_at: instant(data.prepared_at),
    lists,
  }
}

export function parseOfflinePackage(
  value: unknown,
  examId: number,
  ownerId: number,
): OfflinePackage {
  const data = record(value)
  const exam = record(data.exam)
  const room = record(exam.room)
  const packageId = text(data.package_id)
  if (
    !UUID.test(packageId) ||
    id(data.exam_id) !== examId ||
    id(exam.id) !== examId ||
    id(data.responsible_id) !== ownerId
  )
    throw new Error('El paquete no corresponde a tu cuenta y examen.')
  if (
    data.timezone !== 'America/La_Paz' ||
    data.qr_validation !== 'SERVER_ON_SYNC' ||
    id(room.id) !== id(data.room_id)
  )
    throw new Error(
      'El paquete no proporciona las condiciones offline esperadas.',
    )
  const students = rows(data.students).map(packageStudent)
  unique(students.map((row) => row.student_id))
  const prepared = instant(data.prepared_at)
  const expires = instant(data.expires_at)
  const opens = instant(exam.entry_opens_at)
  const closes = instant(exam.entry_closes_at)
  if (
    Date.parse(prepared) >= Date.parse(expires) ||
    Date.parse(opens) >= Date.parse(closes) ||
    expires !== closes
  )
    throw new Error('La vigencia del paquete es inconsistente.')
  // Explicit projection: never persist unexpected API fields or authentication information.
  return {
    package_id: packageId.toLowerCase(),
    exam_id: examId,
    responsible_id: ownerId,
    list_id: id(data.list_id),
    version: id(data.version),
    prepared_at: prepared,
    expires_at: expires,
    timezone: data.timezone,
    room_id: id(data.room_id),
    surname_range: range(data.surname_range),
    qr_validation: data.qr_validation,
    students,
    exam: {
      id: examId,
      name: text(exam.name),
      subject_name: text(exam.subject_name),
      exam_date: text(exam.exam_date),
      start_time: text(exam.start_time),
      duration_minutes: id(exam.duration_minutes),
      status: text(exam.status),
      entry_opens_at: opens,
      entry_closes_at: closes,
      server_time: instant(exam.server_time),
      room: {
        id: id(room.id),
        name: text(room.name),
        code: text(room.code),
        location: nullableText(room.location ?? null),
      },
    },
  }
}

export function parseSyncResults(
  value: unknown,
  examId: number,
  batch: SyncBatch,
): SyncResult[] {
  const data = record(value)
  if (data.exam_id !== examId)
    throw new Error(
      'La sincronización respondió por otro examen. Se conservaron los eventos.',
    )
  const allowed: SyncStatus[] = [
    'ACCEPTED',
    'DUPLICATE',
    'CONFLICT',
    'REJECTED',
  ]
  const results = rows(data.results).map((value): SyncResult => {
    const row = record(value)
    const eventId = text(row.event_id).toLowerCase()
    if (!UUID.test(eventId) || !allowed.includes(row.status as SyncStatus))
      throw new Error(
        'Resultado de sincronización desconocido. Reintenta con los mismos eventos.',
      )
    const status = row.status as SyncStatus
    const entryId = row.entry_id === null ? null : id(row.entry_id)
    if ((status === 'ACCEPTED' || status === 'DUPLICATE') && entryId === null)
      throw new Error('El servidor no confirmó el ingreso oficial.')
    if ((status === 'CONFLICT' || status === 'REJECTED') && entryId !== null)
      throw new Error(
        'El servidor devolvió un resultado contradictorio. Se conservaron los eventos.',
      )
    return {
      event_id: eventId,
      status,
      code: text(row.code),
      message: text(row.message),
      entry_id: entryId,
    }
  })
  unique(results.map((row) => row.event_id))
  const expected = new Set(batch.events.map((event) => event.event_id))
  if (
    expected.size !== results.length ||
    results.some((row) => !expected.has(row.event_id))
  )
    throw new Error(
      'La respuesta no confirma todos los eventos enviados. Se conservaron para reintentar.',
    )
  return results
}
