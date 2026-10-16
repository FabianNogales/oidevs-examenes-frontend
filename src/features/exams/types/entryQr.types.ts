import type {
  EntryBlocker,
  EntryEligibilityStatus,
  EntryEnrollmentStatus,
  EntryRoomStatus,
  EntryStatus,
  EntryControlMeta,
  StudentEntry,
} from './entryControl.types'

export type EntryQrResult =
  'AUTHORIZED' | 'INVALID_QR' | 'WRONG_EXAM' | 'DENIED' | 'ALREADY_REGISTERED'

export type EntryQrPayload = { qr_token: string; room_id: number }

export type EntryQrStudent = {
  student_id: number
  first_names: string
  last_names: string
  sis_code: string
  identity_number: string | null
  profile_photo_url: string | null
}

export type EntryRecord = StudentEntry & {
  exam_id: number
  student_id: number
  room_id: number
  status: string
}

export type EntryQrData = {
  student?: EntryQrStudent | null
  enrollment_status?: EntryEnrollmentStatus
  eligibility_status?: EntryEligibilityStatus
  room_status?: EntryRoomStatus
  entry_status?: EntryStatus
  blockers?: EntryBlocker[]
  reason?: string | null
  observations?: string | null
  entry?: EntryRecord | null
}

export type EntryQrResponse = {
  result: EntryQrResult
  message: string
  processed_at: string
  data: EntryQrData | null
}

// This projection deliberately has no token and is never persisted.
export type RecentEntryScan = {
  id: number
  student: EntryQrStudent | null
  result: EntryQrResult
  message: string
  processed_at: string
}

export type EntryHistoryRecord = { student: EntryQrStudent; entry: EntryRecord }
export type EntryHistoryQuery = {
  search: string
  page: number
  per_page: number
}
export type EntryHistoryResponse = {
  data: EntryHistoryRecord[]
  meta: EntryControlMeta
}
