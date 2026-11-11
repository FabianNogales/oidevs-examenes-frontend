export type InfractionType = 'COPYING' | 'CHEATING' | 'IMPERSONATION'
export type InfractionStatus = 'REPORTED' | 'CONFIRMED' | 'RESOLVED'
export type InfractionActor = { id: number; name: string }
export type InfractionExam = { id: number; name: string; subject_name: string }
export type InfractionStudent = {
  id: number
  first_names: string
  last_names: string
  sis_code: string
  identity_number: string | null
}
export type InfractionMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type Infraction = {
  id: number
  exam_id: number
  student: InfractionStudent
  type: InfractionType
  description: string
  observations: string | null
  status: InfractionStatus
  occurred_at: string
  updated_at: string
  reported_by: InfractionActor
  permissions: { can_update: boolean; allowed_statuses: InfractionStatus[] }
}
export type InfractionAudit = {
  id: number
  action: 'CREATED' | 'STATUS_CHANGED' | 'UPDATED'
  from_status: InfractionStatus | null
  to_status: InfractionStatus
  reason: string | null
  performed_by: InfractionActor
  performed_at: string
}
export type InfractionDetail = {
  exam: InfractionExam
  data: Infraction
  history: InfractionAudit[]
}
export type InfractionPage = {
  exam: InfractionExam
  permissions: { can_create: boolean }
  data: Infraction[]
  meta: InfractionMeta
}
export type StudentInfractionsPage = {
  context: { exam_id: number; student_id: number }
  data: { exam: InfractionExam; infraction: Infraction }[]
  meta: InfractionMeta
}
export type CreateInfractionPayload = {
  student_id: number
  type: InfractionType
  description: string
  observations: string
}
export type ChangeInfractionStatusPayload = {
  status: InfractionStatus
  reason: string
  confirmed: boolean
}
export type InfractionFieldErrors = Partial<
  Record<
    keyof CreateInfractionPayload | keyof ChangeInfractionStatusPayload,
    string
  >
>
