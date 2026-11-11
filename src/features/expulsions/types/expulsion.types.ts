import type {
  InfractionActor,
  InfractionExam,
  InfractionStudent,
  InfractionMeta,
  InfractionType,
  InfractionStatus,
} from '@/features/infractions/types/infraction.types'
export type RelatedInfraction = {
  id: number
  exam_id: number
  student_id: number
  type: InfractionType
  status: InfractionStatus
  description: string
}
export type Expulsion = {
  id: number
  exam_id: number
  student: InfractionStudent
  reason: string
  expelled_at: string
  expelled_by: InfractionActor
  status: 'EXPELLED'
  infraction: RelatedInfraction | null
}
export type ExpulsionPage = {
  exam: InfractionExam
  permissions: { can_create: boolean }
  data: Expulsion[]
  meta: InfractionMeta
}
export type ExpulsionDetail = { exam: InfractionExam; data: Expulsion }
export type ExpulsionHistory = {
  context: { exam_id: number; student_id: number }
  data: { exam: InfractionExam; expulsion: Expulsion }[]
  meta: InfractionMeta
}
export type ExpulsionPayload = {
  student_id: number
  reason: string
  infraction_id: number | null
  confirmed: boolean
}
