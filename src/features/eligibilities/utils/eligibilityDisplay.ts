import type {
  ExamEligibility,
  EligibilityStatus,
} from '../types/eligibility.types'

export const ELIGIBILITY_LABELS: Record<EligibilityStatus, string> = {
  ELIGIBLE: 'HABILITADO',
  INELIGIBLE: 'INHABILITADO',
}

export function getEligibilityStudentName(student: ExamEligibility): string {
  return `${student.first_names} ${student.last_names}`.trim()
}

export function normalizeEligibilitySearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
