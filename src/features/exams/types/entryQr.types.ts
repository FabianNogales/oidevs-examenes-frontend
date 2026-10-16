import type { EntryControlMeta } from './entryControl.types'
import type {
  EntryProcessingResponse,
  EntryRecord,
  EntryRegistrationData,
  EntryStudentIdentity,
} from './entryRegistration.types'

export type { EntryRecord } from './entryRegistration.types'

export type EntryQrResult =
  'AUTHORIZED' | 'INVALID_QR' | 'WRONG_EXAM' | 'DENIED' | 'ALREADY_REGISTERED'

export type EntryQrPayload = { qr_token: string; room_id: number }

// Compatibility aliases: the HU14 request/response shapes remain unchanged.
export type EntryQrStudent = EntryStudentIdentity
export type EntryQrData = EntryRegistrationData
export type EntryQrResponse = EntryProcessingResponse<EntryQrResult>

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
