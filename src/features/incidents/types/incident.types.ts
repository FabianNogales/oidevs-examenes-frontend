export type IncidentType =
  | 'IDENTIFICATION'
  | 'SUSPECTED_IMPERSONATION'
  | 'INELIGIBILITY'
  | 'WRONG_EXAM'
  | 'ENVIRONMENT'

export type IncidentOrigin = 'MANUAL' | 'AUTOMATIC'

export type IncidentStudent = {
  id: number
  first_names: string
  last_names: string
  sis_code: string
  identity_number: string | null
}

export type Incident = {
  id: number
  exam_id: number
  type: IncidentType
  description: string
  origin: IncidentOrigin
  status: string
  student: IncidentStudent | null
  reported_by: { id: number; name: string }
  created_at: string
}

// Proposed HU27 contract: the server supplies author, time, origin and status.
// Manual creation never creates or copies a QR rejection event.
export type CreateIncidentPayload = {
  type: IncidentType
  description: string
  student_id: number | null
}

export type IncidentFieldErrors = Partial<
  Record<keyof CreateIncidentPayload, string>
>

export type IncidentsPage = {
  exam: { id: number; name: string; subject_name: string }
  permissions: { can_create: boolean }
  data: Incident[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
