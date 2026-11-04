import type {
  ExamReportPage,
  ReportExam,
  ReportFilters,
  ReportOption,
  ReportRow,
  ReportMetadata,
} from '../types/report.types'
import {
  positiveId,
  isTimestamp,
  isInfractionType,
  isInfractionStatus,
} from '@/features/infractions/utils/infractionValidation'
import { isIncidentType } from '@/features/incidents/utils/incidentValidation'
import { readInfractionMeta } from '@/features/infractions/api/infractionResponse'
import {
  isDate,
  isReportKind,
  isReportFormat,
  safeReportId,
  reportDay,
} from '../utils/reportValidation'
import { invalidReport } from './reportErrors'
const count = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
export function readOption(v: ReportOption) {
  if (!v || !positiveId(v.id) || typeof v.name !== 'string' || !v.name.trim())
    invalidReport()
}
export function readReportExam(v: ReportExam) {
  readOption(v)
  readOption(v.subject)
  readOption(v.academic_term)
  if (
    !isDate(v.exam_date) ||
    typeof v.status !== 'string' ||
    !v.status.trim() ||
    typeof v.subject.code !== 'string' ||
    !v.subject.code.trim() ||
    !v.permissions ||
    !Array.isArray(v.permissions.report_types) ||
    v.permissions.report_types.some((k) => !isReportKind(k)) ||
    new Set(v.permissions.report_types).size !==
      v.permissions.report_types.length ||
    !Array.isArray(v.permissions.formats) ||
    v.permissions.formats.some((f) => !isReportFormat(f)) ||
    new Set(v.permissions.formats).size !== v.permissions.formats.length
  )
    invalidReport()
}
function row(v: ReportRow, exam: ReportExam, metadata: ReportMetadata) {
  if (
    !v ||
    !positiveId(v.source_id) ||
    v.exam_id !== exam.id ||
    typeof v.state !== 'string' ||
    !v.state.trim() ||
    (v.description !== null && typeof v.description !== 'string') ||
    (v.related_infraction_id !== null && !positiveId(v.related_infraction_id))
  )
    invalidReport()
  const s = v.student
  if (s === null) {
    if (v.record_type !== 'INCIDENT') invalidReport()
  } else if (
    !s ||
    !positiveId(s.id) ||
    typeof s.first_names !== 'string' ||
    typeof s.last_names !== 'string' ||
    typeof s.sis_code !== 'string' ||
    (s.identity_number !== null && typeof s.identity_number !== 'string')
  )
    invalidReport()
  const kinds = {
    ENROLLED: ['ENROLLMENT'],
    ATTENDANCE: ['ENTRY'],
    PENDING_ABSENT: ['PENDING', 'ABSENT'],
    INCIDENTS: ['INCIDENT'],
    DISCIPLINARY: ['INFRACTION', 'EXPULSION'],
  }
  if (!kinds[metadata.type].includes(v.record_type)) invalidReport()
  if (
    ['ENTRY', 'INCIDENT', 'INFRACTION', 'EXPULSION'].includes(v.record_type)
  ) {
    if (
      !isTimestamp(v.occurred_at) ||
      !v.recorded_by ||
      !positiveId(v.recorded_by.id) ||
      typeof v.recorded_by.name !== 'string' ||
      !v.recorded_by.name.trim()
    )
      invalidReport()
  } else if (v.occurred_at !== null || v.recorded_by !== null) invalidReport()
  if (v.record_type === 'ENTRY') {
    if (v.state !== 'VALID' || !['QR', 'MANUAL'].includes(v.method!))
      invalidReport()
  } else if (v.method !== null) invalidReport()
  if (v.record_type === 'ENROLLMENT' && v.state !== 'ENROLLED') invalidReport()
  if (
    ['PENDING', 'ABSENT'].includes(v.record_type) &&
    (v.state !== v.record_type ||
      v.record_type !== metadata.pending_classification)
  )
    invalidReport()
  if (v.record_type === 'INCIDENT') {
    if (
      !isIncidentType(v.category) ||
      !['MANUAL', 'AUTOMATIC'].includes(v.origin!) ||
      !v.description?.trim()
    )
      invalidReport()
  } else if (v.origin !== null) invalidReport()
  if (
    v.record_type === 'INFRACTION' &&
    (!isInfractionType(v.category) ||
      !isInfractionStatus(v.state) ||
      !v.description?.trim())
  )
    invalidReport()
  if (
    v.record_type === 'EXPULSION' &&
    (v.state !== 'EXPELLED' || !v.description?.trim())
  )
    invalidReport()
  if (
    !['INCIDENT', 'INFRACTION'].includes(v.record_type) &&
    v.category !== null
  )
    invalidReport()
  if (v.record_type !== 'EXPULSION' && v.related_infraction_id !== null)
    invalidReport()
  const day = v.occurred_at ? reportDay(v.occurred_at) : exam.exam_date
  if (
    (metadata.filters.date_from && day < metadata.filters.date_from) ||
    (metadata.filters.date_to && day > metadata.filters.date_to)
  )
    invalidReport()
}
export function readExamReport(
  v: ExamReportPage,
  exam: ReportExam,
  filters: ReportFilters,
  page: number,
  previous?: ReportMetadata,
): ExamReportPage {
  if (!v) invalidReport()
  readReportExam(v.exam)
  const r = v.report,
    f = r?.filters
  if (
    v.exam.id !== exam.id ||
    v.exam.subject.id !== exam.subject.id ||
    v.exam.academic_term.id !== exam.academic_term.id ||
    !r ||
    !safeReportId(r.id) ||
    r.type !== filters.type ||
    r.scope !== 'EXAM' ||
    r.source !== 'SERVER' ||
    r.offline_pending_included !== false ||
    !isTimestamp(r.generated_at) ||
    !count(r.total_records) ||
    !count(r.total_participants) ||
    !f ||
    f.exam_id !== exam.id ||
    f.subject_id !== exam.subject.id ||
    f.academic_term_id !== exam.academic_term.id ||
    f.date_from !== (filters.date_from || null) ||
    f.date_to !== (filters.date_to || null) ||
    !Array.isArray(r.formats) ||
    r.formats.some(
      (t) =>
        !isReportFormat(t) ||
        !exam.permissions.formats.includes(t) ||
        !v.exam.permissions.formats.includes(t),
    ) ||
    new Set(r.formats).size !== r.formats.length ||
    !exam.permissions.report_types.includes(r.type) ||
    !v.exam.permissions.report_types.includes(r.type) ||
    !Array.isArray(v.data) ||
    new Set(v.data.map((d) => `${d?.record_type}:${d?.source_id}`)).size !==
      v.data.length
  )
    invalidReport()
  if (r.type === 'PENDING_ABSENT') {
    if (
      !['PENDING', 'ABSENT', 'NOT_APPLICABLE'].includes(
        r.pending_classification!,
      )
    )
      invalidReport()
    if (
      v.exam.status === 'CANCELLED' &&
      (r.pending_classification !== 'NOT_APPLICABLE' || r.total_records !== 0)
    )
      invalidReport()
  } else if (r.pending_classification !== null) invalidReport()
  if (
    previous &&
    (r.id !== previous.id ||
      r.generated_at !== previous.generated_at ||
      r.total_records !== previous.total_records ||
      r.total_participants !== previous.total_participants ||
      r.pending_classification !== previous.pending_classification ||
      (
        [
          'exam_id',
          'subject_id',
          'academic_term_id',
          'date_from',
          'date_to',
        ] as const
      ).some((key) => r.filters[key] !== previous.filters[key]))
  )
    invalidReport()
  readInfractionMeta(v.meta, page, v.data.length)
  if (v.meta.per_page !== 10 || v.meta.total !== r.total_records)
    invalidReport()
  v.data.forEach((d) => row(d, v.exam, r))
  if (
    ['ENROLLED', 'ATTENDANCE', 'PENDING_ABSENT'].includes(r.type) &&
    (r.total_records > r.total_participants ||
      new Set(v.data.map((d) => d.student!.id)).size !== v.data.length)
  )
    invalidReport()
  return v
}
