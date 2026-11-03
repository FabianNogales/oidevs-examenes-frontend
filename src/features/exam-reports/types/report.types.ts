import type {
  InfractionStudent,
  InfractionActor,
  InfractionMeta,
} from '@/features/infractions/types/infraction.types'
export type ReportKind =
  'ENROLLED' | 'ATTENDANCE' | 'PENDING_ABSENT' | 'INCIDENTS' | 'DISCIPLINARY'
export type ReportFormat = 'pdf' | 'csv'
export type ReportOption = { id: number; name: string }
export type ReportExam = {
  id: number
  name: string
  exam_date: string
  status: string
  subject: ReportOption & { code: string }
  academic_term: ReportOption
  permissions: { report_types: ReportKind[]; formats: ReportFormat[] }
}
export type ReportCatalogQuery = {
  search: string
  page: number
  subject_id?: number
  academic_term_id?: number
  exam_id?: number
}
export type ReportCatalog = {
  data: ReportExam[]
  filters: { subjects: ReportOption[]; academic_terms: ReportOption[] }
  meta: InfractionMeta
}
export type ReportFilters = {
  type: ReportKind
  date_from: string
  date_to: string
}
export type ReportRow = {
  source_id: number
  record_type:
    | 'ENROLLMENT'
    | 'ENTRY'
    | 'PENDING'
    | 'ABSENT'
    | 'INCIDENT'
    | 'INFRACTION'
    | 'EXPULSION'
  exam_id: number
  student: InfractionStudent | null
  state: string
  category: string | null
  description: string | null
  occurred_at: string | null
  method: 'QR' | 'MANUAL' | null
  origin: 'MANUAL' | 'AUTOMATIC' | null
  recorded_by: InfractionActor | null
  related_infraction_id: number | null
}
export type ReportMetadata = {
  id: string
  type: ReportKind
  scope: 'EXAM'
  generated_at: string
  source: 'SERVER'
  offline_pending_included: false
  total_records: number
  total_participants: number
  pending_classification: 'PENDING' | 'ABSENT' | 'NOT_APPLICABLE' | null
  formats: ReportFormat[]
  filters: {
    exam_id: number
    subject_id: number
    academic_term_id: number
    date_from: string | null
    date_to: string | null
  }
}
export type ExamReportPage = {
  exam: ReportExam
  report: ReportMetadata
  data: ReportRow[]
  meta: InfractionMeta
}
