import type { EntryControlExam } from '@/features/exams/types/entryControl.types'

export type OfflineExam = Pick<
  EntryControlExam,
  | 'id'
  | 'name'
  | 'subject_name'
  | 'exam_date'
  | 'start_time'
  | 'duration_minutes'
  | 'status'
  | 'entry_opens_at'
  | 'entry_closes_at'
  | 'server_time'
  | 'room'
>

export type AssignedStudent = {
  student_id: number
  first_names: string
  last_names: string
  sis_code: string
}
export type OfflineStudent = AssignedStudent & {
  identity_number: string | null
  student_status: string
  enrollment_status: string | null
  eligibility_status: string | null
  eligibility_revision: number | null
  entry_status: 'PENDING' | 'REGISTERED'
}
export type SurnameRange = { from: string | null; to: string | null }
export type OfflineAssignment = {
  list_id: number
  responsible_id: number
  responsible_name: string | null
  student_count: number
  surname_range: SurnameRange
  students: AssignedStudent[]
}
export type OfflineDistribution = {
  exam_id: number
  version: number
  prepared_at: string
  lists: OfflineAssignment[]
}
export type OfflinePackage = {
  package_id: string
  exam_id: number
  exam: OfflineExam
  list_id: number
  version: number
  responsible_id: number
  prepared_at: string
  expires_at: string
  timezone: 'America/La_Paz'
  room_id: number
  surname_range: SurnameRange
  qr_validation: 'SERVER_ON_SYNC'
  students: OfflineStudent[]
}
export type SyncStatus = 'ACCEPTED' | 'DUPLICATE' | 'CONFLICT' | 'REJECTED'
export type ClientEntryEvent = {
  event_id: string
  student_id: number
  method: 'MANUAL' | 'QR'
  captured_at: string
  device_id?: string
  qr_token?: string
}
export type SyncResult = {
  event_id: string
  status: SyncStatus
  code: string
  message: string
  entry_id: number | null
}
export type SyncBatch = {
  package_id: string
  list_id: number
  version: number
  room_id: number
  events: ClientEntryEvent[]
}
export type StoredPackage = {
  key: string
  ownerId: number
  examId: number
  savedAt: string
  staleReason: string | null
  packet: OfflinePackage
}
export type LocalEntry = {
  key: string
  ownerId: number
  examId: number
  packageId: string
  listId: number
  version: number
  roomId: number
  payload: ClientEntryEvent
  status: 'PENDING' | SyncStatus
  result: SyncResult | null
}
