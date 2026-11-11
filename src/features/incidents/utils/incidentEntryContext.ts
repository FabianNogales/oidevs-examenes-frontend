import type {
  EntryProcessingResponse,
  EntryStudentIdentity,
} from '@/features/exams/types/entryRegistration.types'
import type { IncidentStudent, IncidentType } from '../types/incident.types'
import { isPositiveId } from './incidentValidation'

export type IncidentEntryContext = {
  student: IncidentStudent | null
  type?: IncidentType
}

export function incidentStudent(
  student?: EntryStudentIdentity | null,
): IncidentStudent | null {
  if (
    !student ||
    !isPositiveId(student.student_id) ||
    typeof student.first_names !== 'string' ||
    typeof student.last_names !== 'string' ||
    typeof student.sis_code !== 'string'
  )
    return null
  return {
    id: student.student_id,
    first_names: student.first_names,
    last_names: student.last_names,
    sis_code: student.sis_code,
    identity_number: student.identity_number ?? null,
  }
}

export function persistedEntryIncident(
  response: EntryProcessingResponse,
  examId: number,
): number | null {
  const reference = response.incident
  return reference && reference.exam_id === examId && isPositiveId(reference.id)
    ? reference.id
    : null
}

export function entryIncidentContext(
  response: EntryProcessingResponse,
): IncidentEntryContext {
  return {
    student: incidentStudent(response.data?.student),
    type:
      response.data?.eligibility_status === 'INELIGIBLE' ||
      response.data?.blockers?.some((item) => item.code === 'INELIGIBLE')
        ? 'INELIGIBILITY'
        : undefined,
  }
}
