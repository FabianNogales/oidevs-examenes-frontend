import type {
  EntryBlocker,
  EntryControlStudent,
  EntryEligibilityStatus,
  EntryEnrollmentStatus,
  EntryRoomStatus,
  EntryStatus,
  StudentEntry,
} from './entryControl.types'

export type EntryStudentIdentity = Pick<
  EntryControlStudent,
  | 'student_id'
  | 'first_names'
  | 'last_names'
  | 'sis_code'
  | 'identity_number'
  | 'profile_photo_url'
>

export type EntryRecord = StudentEntry & {
  exam_id: number
  student_id: number
  room_id: number
  status: string
}

export type EntryRegistrationResult =
  'AUTHORIZED' | 'DENIED' | 'ALREADY_REGISTERED'

export type EntryProcessingResult =
  EntryRegistrationResult | 'INVALID_QR' | 'WRONG_EXAM'

export type EntryRegistrationData = {
  student?: EntryStudentIdentity | null
  enrollment_status?: EntryEnrollmentStatus
  eligibility_status?: EntryEligibilityStatus
  room_status?: EntryRoomStatus
  entry_status?: EntryStatus
  blockers?: EntryBlocker[]
  reason?: string | null
  observations?: string | null
  entry?: EntryRecord | null
}

export type EntryProcessingResponse<
  Result extends EntryProcessingResult = EntryProcessingResult,
> = {
  result: Result
  message: string
  processed_at: string
  data: EntryRegistrationData | null
}

export type EntryManualPayload = { room_id: number }
export type EntryManualResponse =
  EntryProcessingResponse<EntryRegistrationResult>
export type EntryMethod = 'QR' | 'MANUAL'

// Session-only projection. Never retain a QR token or persist these records.
export type RecentEntryRecord = {
  id: number
  student: EntryStudentIdentity | null
  result: EntryProcessingResult
  message: string
  processed_at: string
  verification_method: string | null
}
