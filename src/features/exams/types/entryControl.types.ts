import type { EvaluationType, Room } from './exam.types'

export type EntryEnrollmentStatus = 'ACTIVE' | 'INACTIVE' | null
export type EntryEligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE' | null
export type EntryRoomStatus = 'MATCH' | 'MISMATCH' | 'NOT_APPLICABLE'
export type EntryStatus = 'PENDING' | 'REGISTERED' | 'NOT_APPLICABLE'
export type EntryBlockerCode =
  | 'STUDENT_INACTIVE'
  | 'NOT_ENROLLED'
  | 'ELIGIBILITY_PENDING'
  | 'INELIGIBLE'
  | 'ROOM_MISMATCH'
  | 'ALREADY_REGISTERED'
  | 'EXAM_UNAVAILABLE'

export type EntryBlocker = { code: EntryBlockerCode; message: string }

export type EntryControlExam = {
  id: number
  name: string
  subject_name: string
  exam_date: string
  start_time: string
  duration_minutes: number
  evaluation_type: EvaluationType
  status: string
  entry_available: boolean
  entry_unavailable_reason: string | null
  entry_opens_at: string | null
  entry_closes_at: string | null
  server_time: string
  room: Room | null
}

export type StudentEntry = {
  id: number
  entered_at: string
  verification_method: string
  verified_by: number
  verified_by_name: string
}

export type EntryControlStudent = {
  student_id: number
  first_names: string
  last_names: string
  sis_code: string
  identity_number: string | null
  historical_photo_url?: string | null
  historical_photo_revision?: number
  profile_photo_url?: string | null
  student_status: string
  is_expelled?: boolean
  expulsion?: { id: number; expelled_at: string } | null
  enrollment_status: EntryEnrollmentStatus
  eligibility_status: EntryEligibilityStatus
  reason_code: string | null
  reason: string | null
  observations: string | null
  assigned_room_id: number | null
  controlled_room_id: number | null
  room_status: EntryRoomStatus
  entry_status: EntryStatus
  entry: StudentEntry | null
  meets_entry_conditions: boolean
  blockers: EntryBlocker[]
}

export type EntryControlSummary = {
  total_students: number
  registered: number
  pending: number
  not_applicable: number
}

export type EntryControlFilterCounts = {
  all: number
  registered: number
  pending: number
  incidents: number
}

export type EntryControlFilter = keyof EntryControlFilterCounts

export type EntryControlMeta = {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export type EntryControlQuery = {
  search: string
  page: number
  per_page: number
  room_id?: number
  entry_status?: 'REGISTERED' | 'PENDING'
  has_incident?: boolean
}

export type EntryControlStudentsResponse = {
  exam: EntryControlExam
  // Optional HU28 extension; absent permission never enables management.
  permissions?: { can_annul_entries: boolean }
  summary: EntryControlSummary
  filter_counts: EntryControlFilterCounts
  data: EntryControlStudent[]
  meta: EntryControlMeta
}

export type EntryControlStudentResponse = {
  exam: EntryControlExam
  data: EntryControlStudent
}
