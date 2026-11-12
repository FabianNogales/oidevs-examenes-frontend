import type {
  EvaluationResult,
  EvaluationView,
} from '../types/eligibilityAutomation.types'
import { assessmentLabel } from './automationPresentation'

// «Revisar y aplicar» (HU34 E1). Todo lo de este archivo es presentación sobre la instantánea que
// calcula el backend: aquí no se evalúa ningún criterio ni se decide ninguna habilitación.
//
// Semántica usada por el resumen y por los filtros:
// - Estado final propuesto: `effective_status`. Solo es una decisión si vale ELIGIBLE o INELIGIBLE;
//   con cualquier otro valor (PENDING o nulo) no hay decisión nueva y se conserva la vigente.
// - Cambio de estado: el estado final propuesto es una decisión y difiere de `current_status`.
//   No equivale a `will_update`: el backend puede volver a registrar una habilitación sin
//   cambiar su estado.
// - Pendiente: `computed_status === 'PENDING'`; el backend no pudo resolver la evaluación.
//   Un pendiente puede aparecer además en Habilitados o Inhabilitados si su estado final
//   propuesto es una decisión.
// - Protegido: `manual_override_preserved`. El contrato actual no indica el origen de la decisión.

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
  | 'all'
  | 'changes'
  | 'eligible'
  | 'ineligible'
  | 'pending'
  | 'protected'

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
    isDecision(result.effective_status) &&
    result.effective_status !== result.current_status
  )
}

export function isPendingResult(result: EvaluationResult): boolean {
  return result.computed_status === 'PENDING'
}

export function isProtectedResult(result: EvaluationResult): boolean {
  return result.manual_override_preserved === true
}

export function matchesReviewFilter(
  result: EvaluationResult,
  filter: ReviewFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'changes':
      return isStateChange(result)
    case 'eligible':
      return result.effective_status === 'ELIGIBLE'
    case 'ineligible':
      return result.effective_status === 'INELIGIBLE'
    case 'pending':
      return isPendingResult(result)
    case 'protected':
      return isProtectedResult(result)
  }
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function matchesReviewSearch(
  result: EvaluationResult,
  query: string,
): boolean {
  const needle = normalizeSearch(query)
  if (!needle) return true
  return (
    normalizeSearch(result.student.display_name ?? '').includes(needle) ||
    normalizeSearch(String(result.student.sis ?? '')).includes(needle)
  )
}

/** El filtro y la búsqueda se aplican siempre antes de paginar. */
export function filterReviewResults(
  results: readonly EvaluationResult[],
  filter: ReviewFilter,
  query: string,
): EvaluationResult[] {
  return results.filter(
    (result) =>
      matchesReviewFilter(result, filter) && matchesReviewSearch(result, query),
  )
}

export function countReviewFilters(
  results: readonly EvaluationResult[],
): Record<ReviewFilter, number> {
  const counts: Record<ReviewFilter, number> = {
    all: 0,
    changes: 0,
    eligible: 0,
    ineligible: 0,
    pending: 0,
    protected: 0,
  }
  for (const result of results)
    for (const { id } of REVIEW_FILTERS)
      if (matchesReviewFilter(result, id)) counts[id] += 1
  return counts
}

export function paginateReview<T>(
  items: readonly T[],
  page: number,
  pageSize = REVIEW_PAGE_SIZE,
) {
  const total = items.length
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(1, Math.trunc(page) || 1), lastPage)
  const start = (currentPage - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)
  return {
    items: pageItems,
    currentPage,
    lastPage,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + pageItems.length,
  }
}

export type ReviewSummary = {
  /** Estudiantes evaluados según el backend. */
  total: number
  /** Resultados efectivamente cargados en memoria. */
  loaded: number
  eligible: number
  ineligible: number
  pending: number
  changes: number
  toEligible: number
  toIneligible: number
  protected: number
  /** Registros que el backend volverá a escribir (`will_update`). */
  recordUpdates: number
  /** `will_update` sin cambio real de estado. */
  updatesWithoutChange: number
}

/**
 * El backend aporta `total` y `pending`. Sus `eligible` e `ineligible` cuentan el estado
 * calculado, no el final propuesto, así que esos dos y los que no envía (cambios, protegidos,
 * registros que se reescriben) se cuentan aquí sobre todos los resultados cargados.
 */
export function summarizeReview(
  view: Pick<EvaluationView, 'results' | 'summary'>,
): ReviewSummary {
  const results = view.results.data
  const changes = results.filter(isStateChange)
  const updates = results.filter((result) => result.will_update)
  return {
    total: view.summary?.total ?? results.length,
    loaded: results.length,
    eligible: results.filter((result) => result.effective_status === 'ELIGIBLE')
      .length,
    ineligible: results.filter(
      (result) => result.effective_status === 'INELIGIBLE',
    ).length,
    pending: view.summary?.pending ?? results.filter(isPendingResult).length,
    changes: changes.length,
    toEligible: changes.filter(
      (result) => result.effective_status === 'ELIGIBLE',
    ).length,
    toIneligible: changes.filter(
      (result) => result.effective_status === 'INELIGIBLE',
    ).length,
    protected: results.filter(isProtectedResult).length,
    recordUpdates: updates.length,
    updatesWithoutChange: updates.filter((result) => !isStateChange(result))
      .length,
  }
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

export function briefReason(reason: string | null | undefined, max = 90): string {
  const text = (reason ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return '—'
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}
