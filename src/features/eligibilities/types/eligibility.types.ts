export type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE'

export type ExamEligibility = {
  id: number
  student_id: number
  sis_code: string
  identity_number: string
  first_names: string
  last_names: string
  email: string
  profile_photo_url: string | null
  status: EligibilityStatus
  reason_code: string | null
  reason: string | null
  observations: string | null
  evaluated_by: number | null
  evaluated_at: string | null
}

// Older GET responses may omit the new nullable fields.
export type EligibilitiesResponse = {
  data: (Omit<ExamEligibility, 'reason_code' | 'observations'> & {
    reason_code?: string | null
    observations?: string | null
  })[]
}

export type EligibilityReason = { code: string; label: string }

export type EligibilityReasonsResponse = { data: EligibilityReason[] }

export type UpdateEligibilityPayload =
  | { status: 'ELIGIBLE' }
  | { status: 'INELIGIBLE'; reason_code: string; observations: string }

export type BulkEligibilityRowError = {
  row: number
  sis_code: string
  messages: Record<string, string[]>
}

export type BulkEligibilityResult = {
  total_rows: number
  updated_rows: number
  failed_rows: number
  errors: BulkEligibilityRowError[]
}

export type BulkEligibilityResponse = {
  message: string
  data: BulkEligibilityResult
}
