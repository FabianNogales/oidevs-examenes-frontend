import type {
  EvaluationResult,
  EvaluationView,
} from '../types/eligibilityAutomation.types'
import { assessmentLabel } from './automationPresentation'

export function displayStatus(status: string | null | undefined): string {
  if (status === 'ELIGIBLE') return 'Habilitado'
  if (status === 'INELIGIBLE') return 'Inhabilitado'
  if (status === 'PENDING') return 'Pendiente'
  return 'Sin decisión vigente'
}

export function displayValue(
  value: unknown,
  assessmentLabels: Record<string, string> = {},
): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value))
    return value
      .map((item) =>
        typeof item === 'string'
          ? assessmentLabel(item, assessmentLabels[item])
          : String(item),
      )
      .join(' + ')
  if (typeof value === 'object') return 'Dato compuesto'
  return String(value)
}

export type ReviewFilter =
  'all' | 'changes' | 'eligible' | 'ineligible' | 'pending' | 'protected'

export const REVIEW_FILTERS: readonly { id: ReviewFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'changes', label: 'Solo cambios' },
  { id: 'eligible', label: 'Habilitados' },
  { id: 'ineligible', label: 'Inhabilitados' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'protected', label: 'Protegidos' },
]

export const DEFAULT_REVIEW_FILTER: ReviewFilter = 'changes'
export const REVIEW_PAGE_SIZE = 10

function isDecision(status: unknown): status is 'ELIGIBLE' | 'INELIGIBLE' {
  return status === 'ELIGIBLE' || status === 'INELIGIBLE'
}

export function isStateChange(result: EvaluationResult): boolean {
  return (
    result.state_will_change ??
    (result.will_update &&
      isDecision(result.effective_status) &&
      result.effective_status !== result.current_status)
  )
}

export function isPendingResult(result: EvaluationResult): boolean {
  return result.computed_status === 'PENDING'
}

export function isProtectedResult(result: EvaluationResult): boolean {
  return result.manual_override_preserved === true
}

// Históricos sin motivo efectivo usan el motivo vigente y luego la explicación original.
// Un null explícito se conserva: el servidor eliminó el motivo de la decisión final.
export function effectiveReason(result: EvaluationResult): string | null {
  if (result.effective_reason !== undefined) return result.effective_reason
  if (
    (isProtectedResult(result) || !result.will_update) &&
    result.current_reason !== undefined
  )
    return result.current_reason
  return result.reason
}

export function protectedLabel(result: EvaluationResult): string {
  if (result.protected_source === 'MANUAL') return 'Protegido · Manual'
  if (result.protected_source === 'LEGACY') return 'Protegido · Heredado'
  return 'Protegido'
}

export type ReviewSummary = {
  total: number
  eligible: number | undefined
  ineligible: number | undefined
  unset: number | undefined
  pending: number
  changes: number | undefined
  protected: number | undefined
  traceability: number | undefined
}

// Los contadores globales proceden exclusivamente del servidor, también para históricos.
export function summarizeReview(
  view: Pick<EvaluationView, 'summary'>,
): ReviewSummary {
  const summary = view.summary
  return {
    total: summary.total,
    eligible: summary.effective_eligible,
    ineligible: summary.effective_ineligible,
    unset: summary.effective_unset,
    pending: summary.pending,
    changes: summary.state_changes,
    protected: summary.protected,
    traceability: summary.traceability_only,
  }
}

export function hasGlobalReviewSummary(view: EvaluationView): boolean {
  return [
    view.summary.effective_eligible,
    view.summary.effective_ineligible,
    view.summary.effective_unset,
    view.summary.state_changes,
    view.summary.traceability_only,
    view.summary.protected,
  ].every(
    (value) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0,
  )
}

/** Una fecha de caducidad ausente o ilegible no bloquea: el backend sigue validando la instantánea. */
export function isSnapshotExpired(
  expiresAt: string | null | undefined,
  now: number,
): boolean {
  if (!expiresAt) return false
  const limit = Date.parse(expiresAt)
  return Number.isFinite(limit) && now >= limit
}

export function briefReason(
  reason: string | null | undefined,
  max = 90,
): string {
  const text = (reason ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return '—'
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}
