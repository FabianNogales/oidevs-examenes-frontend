import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import dialogBase from '@/shared/styles/dialogBase.module.css'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import type {
  CriterionResult,
  EvaluationResult,
  EvaluationView,
} from '../types/eligibilityAutomation.types'
import {
  criterionLabel,
  evaluationDateLabel,
  missingFieldLabel,
} from '../utils/automationPresentation'
import {
  DEFAULT_REVIEW_FILTER,
  REVIEW_FILTERS,
  briefReason,
  countReviewFilters,
  displayStatus,
  displayValue,
  filterReviewResults,
  isPendingResult,
  isProtectedResult,
  isSnapshotExpired,
  isStateChange,
  paginateReview,
  summarizeReview,
} from '../utils/evaluationReview'
import type { ReviewFilter, ReviewSummary } from '../utils/evaluationReview'
import pageStyles from '../pages/EligibilityAutomation.module.css'
import styles from './EvaluationReview.module.css'

type ReviewRow = { id: number; result: EvaluationResult }

const EMPTY_BY_FILTER: Record<ReviewFilter, string> = {
  all: 'La evaluación no devolvió estudiantes.',
  changes: 'Ningún estudiante cambia de estado con esta evaluación.',
  eligible: 'Ningún estudiante queda habilitado.',
  ineligible: 'Ningún estudiante queda inhabilitado.',
  pending: 'Ningún estudiante queda pendiente.',
  protected: 'No hay decisiones protegidas.',
}

function statusBadgeClass(status: string | null | undefined): string {
  if (status === 'ELIGIBLE') return `${styles.badge} ${styles.badgeEligible}`
  if (status === 'INELIGIBLE') return `${styles.badge} ${styles.badgeIneligible}`
  return styles.badge
}

/** Resultados por criterio de un estudiante (lista compartida con el historial). */
export function CriterionResults({
  results,
  criterionLabels = {},
  assessmentLabels = {},
}: {
  results: readonly CriterionResult[]
  criterionLabels?: Record<string, string>
  assessmentLabels?: Record<string, string>
}) {
  return (
    <ul className={pageStyles.criteriaResults}>
      {results.map((item, index) => (
        <li key={`${item.code}-${index}`}>
          <strong>
            {criterionLabel(item.code, item.name ?? criterionLabels[item.code])}
          </strong>
          <span>
            Resultado:{' '}
            {item.status === 'PASSED'
              ? 'Cumple'
              : item.status === 'FAILED'
                ? 'No cumple'
                : 'Pendiente'}
          </span>
          {'actual_value' in item ? (
            <span>
              {item.code === 'MIN_ATTENDANCE_PERCENTAGE'
                ? 'Asistencia'
                : 'Valor actual'}
              : {displayValue(item.actual_value, assessmentLabels)}
            </span>
          ) : null}
          {'required_value' in item ? (
            <span>
              Requerido: {displayValue(item.required_value, assessmentLabels)}
            </span>
          ) : null}
          {item.reason ? <span>{item.reason}</span> : null}
        </li>
      ))}
    </ul>
  )
}

function SummaryTiles({ summary }: { summary: ReviewSummary }) {
  const tiles: [string, number][] = [
    ['Total evaluado', summary.total],
    ['Habilitados propuestos', summary.eligible],
    ['Inhabilitados propuestos', summary.ineligible],
    ['Pendientes', summary.pending],
    ['Cambios de estado', summary.changes],
    ['Decisiones protegidas', summary.protected],
  ]
  return (
    <dl className={`${pageStyles.summary} ${styles.summary}`}>
      {tiles.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ResultDetailDialog({
  result,
  criterionLabels,
  assessmentLabels,
  onClose,
}: {
  result: EvaluationResult
  criterionLabels: Record<string, string>
  assessmentLabels: Record<string, string>
  onClose: () => void
}) {
  return (
    <PortalDialog
      drawer
      title={result.student.display_name}
      subtitle={`SIS ${result.student.sis}`}
      onClose={onClose}
      closeOnBackdrop
      closeClassName={dialogBase.closeButton}
      footer={
        <button
          type="button"
          className={sharedStyles.secondaryButton}
          onClick={onClose}
        >
          Cerrar
        </button>
      }
    >
      <div className={styles.detailBody}>
        {isProtectedResult(result) ? (
          <p className={pageStyles.manualNotice}>
            Se conserva la decisión manual vigente.
          </p>
        ) : null}
        <dl className={pageStyles.resultDetails}>
          <div>
            <dt>Estado actual</dt>
            <dd>{displayStatus(result.current_status)}</dd>
          </div>
          <div>
            <dt>Estado final propuesto</dt>
            <dd>{displayStatus(result.effective_status)}</dd>
          </div>
          <div>
            <dt>Resultado calculado</dt>
            <dd>{displayStatus(result.computed_status)}</dd>
          </div>
          <div>
            <dt>Cambia de estado</dt>
            <dd>{isStateChange(result) ? 'Sí' : 'No'}</dd>
          </div>
          <div>
            <dt>Se actualizará el registro</dt>
            <dd>{result.will_update ? 'Sí' : 'No'}</dd>
          </div>
        </dl>
        <section aria-label="Motivo">
          <h3>Motivo</h3>
          <p className={pageStyles.reasonText}>{result.reason || '—'}</p>
        </section>
        {result.missing_fields.length > 0 ? (
          <p className={pageStyles.note}>
            Información faltante:{' '}
            {result.missing_fields
              .map((field) => missingFieldLabel(field, assessmentLabels))
              .join(', ')}
          </p>
        ) : null}
        <section aria-label="Resultados por criterio">
          <h3>Resultados por criterio</h3>
          {result.criteria_results.length > 0 ? (
            <CriterionResults
              results={result.criteria_results}
              criterionLabels={criterionLabels}
              assessmentLabels={assessmentLabels}
            />
          ) : (
            <p>Esta evaluación no incluye resultados por criterio.</p>
          )}
        </section>
      </div>
    </PortalDialog>
  )
}

function ApplyDialog({
  summary,
  working,
  onCancel,
  onConfirm,
}: {
  summary: ReviewSummary
  working: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const impact: [string, number][] = [
    ['Pasan a habilitado', summary.toEligible],
    ['Pasan a inhabilitado', summary.toIneligible],
    ['Sin cambio de estado', summary.loaded - summary.changes],
    ['Decisiones protegidas', summary.protected],
    ['Pendientes', summary.pending],
  ]
  return (
    <PortalDialog
      title="Aplicar habilitaciones"
      onClose={onCancel}
      busy={working}
      className={styles.confirmDialog}
      closeClassName={dialogBase.closeButton}
      footer={
        <div className={styles.dialogActions}>
          <button
            type="button"
            className={sharedStyles.secondaryButton}
            onClick={onCancel}
            disabled={working}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={sharedStyles.primaryButton}
            onClick={onConfirm}
            disabled={working}
          >
            {working
              ? 'Aplicando…'
              : `Aplicar a ${summary.total} ${summary.total === 1 ? 'estudiante' : 'estudiantes'}`}
          </button>
        </div>
      }
    >
      <p>
        Se aplicará la evaluación completa: los resultados de los{' '}
        <strong>{summary.total}</strong> estudiantes de esta revisión, no solo
        los que muestra la tabla con el filtro o la página actuales.
      </p>
      <dl className={`${pageStyles.summary} ${styles.impact}`}>
        {impact.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={pageStyles.note}>
        Las decisiones protegidas y los pendientes conservan su habilitación
        vigente.
      </p>
    </PortalDialog>
  )
}

export function EvaluationReview({
  evaluation,
  criterionLabels,
  assessmentLabels,
  working,
  mustRefresh,
  criteria,
  onApply,
  onRegenerate,
}: {
  evaluation: EvaluationView
  criterionLabels: Record<string, string>
  assessmentLabels: Record<string, string>
  /** A request (apply or regenerate) is in flight. */
  working: boolean
  /** The snapshot can no longer be applied (conflict): a new review is required. */
  mustRefresh: boolean
  /** Criteria applied by this snapshot, rendered by the page. */
  criteria?: ReactNode
  /** Confirms the whole snapshot through the existing endpoint. */
  onApply: () => void | Promise<void>
  onRegenerate: () => void
}) {
  const results = evaluation.results.data
  const [filter, setFilter] = useState<ReviewFilter>(DEFAULT_REVIEW_FILTER)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<EvaluationResult | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000)
    return () => window.clearInterval(timer)
  }, [])

  const summary = useMemo(() => summarizeReview(evaluation), [evaluation])
  const counts = useMemo(() => countReviewFilters(results), [results])
  const filtered = useMemo(
    () => filterReviewResults(results, filter, query),
    [results, filter, query],
  )
  const current = paginateReview(filtered, page)
  const rows: ReviewRow[] = current.items.map((result) => ({
    id: result.student.id,
    result,
  }))
  const expired = isSnapshotExpired(evaluation.expires_at, now)
  const incomplete = summary.loaded !== summary.total
  const applyBlocked = working || mustRefresh || expired || incomplete

  const columns: TableColumnDef<ReviewRow>[] = [
    {
      id: 'student',
      header: 'Estudiante',
      width: '24%',
      cell: ({ result }) => (
        <strong className={styles.studentName}>
          {result.student.display_name}
        </strong>
      ),
    },
    { id: 'sis', header: 'SIS', cell: ({ result }) => result.student.sis },
    {
      id: 'current',
      header: 'Estado actual',
      cell: ({ result }) => (
        <span className={statusBadgeClass(result.current_status)}>
          {displayStatus(result.current_status)}
        </span>
      ),
    },
    {
      id: 'final',
      header: 'Estado final propuesto',
      cell: ({ result }) => (
        <span className={styles.statusCell}>
          <span className={statusBadgeClass(result.effective_status)}>
            {displayStatus(result.effective_status)}
          </span>
          {isStateChange(result) ? (
            <span className={styles.tag}>Cambia</span>
          ) : null}
          {isProtectedResult(result) ? (
            <span className={styles.tag}>Protegido</span>
          ) : null}
          {isPendingResult(result) ? (
            <span className={styles.tag}>Se conserva el estado actual</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'reason',
      header: 'Motivo',
      width: '26%',
      cell: ({ result }) => (
        <span className={styles.reason}>{briefReason(result.reason)}</span>
      ),
    },
    {
      id: 'action',
      header: 'Acción',
      align: 'right',
      cell: ({ result }) => (
        <button
          type="button"
          className={styles.detailButton}
          aria-label={`Ver detalle de ${result.student.display_name}`}
          onClick={() => setDetail(result)}
        >
          Ver detalle
        </button>
      ),
    },
  ]

  async function apply() {
    // The snapshot may have expired while the confirmation was open.
    const moment = Date.now()
    if (isSnapshotExpired(evaluation.expires_at, moment)) {
      setNow(moment)
      setConfirming(false)
      return
    }
    await onApply()
    setConfirming(false)
  }

  return (
    <div className={`${pageStyles.panel} ${styles.review}`}>
      <section aria-labelledby="review-summary-title">
        <h3 id="review-summary-title">Resumen de la evaluación</h3>
        <SummaryTiles summary={summary} />
        {summary.updatesWithoutChange > 0 ? (
          <p className={pageStyles.note}>
            El servidor volverá a registrar {summary.recordUpdates}{' '}
            {summary.recordUpdates === 1 ? 'habilitación' : 'habilitaciones'};{' '}
            {summary.updatesWithoutChange} de ellas no cambian de estado.
          </p>
        ) : null}
        <p className={styles.tableStatus}>
          Revisión vigente hasta {evaluationDateLabel(evaluation.expires_at)}.
        </p>
      </section>

      {criteria}

      <section aria-labelledby="review-results-title">
        <h3 id="review-results-title">Estudiantes</h3>
        <p className={styles.tableStatus} role="status">
          {current.total === 0
            ? 'Sin estudiantes para este filtro.'
            : `${current.total} de ${summary.loaded} estudiantes con el filtro «${REVIEW_FILTERS.find(({ id }) => id === filter)?.label}»${query ? ` y la búsqueda «${query}»` : ''}.`}
        </p>
        <DataTable<ReviewRow>
          columns={columns}
          data={rows}
          loading={false}
          entityLabel="estudiantes"
          searchPlaceholder="Buscar por estudiante o SIS"
          onSearch={(value) => {
            setQuery(value)
            setPage(1)
          }}
          filters={
            <div className={styles.filters}>
              {REVIEW_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={styles.filter}
                  aria-pressed={filter === id}
                  onClick={() => {
                    setFilter(id)
                    setPage(1)
                  }}
                >
                  {label} ({counts[id]})
                </button>
              ))}
            </div>
          }
          pagination={{
            currentPage: current.currentPage,
            lastPage: current.lastPage,
            total: current.total,
            from: current.from,
            to: current.to,
          }}
          onPageChange={setPage}
          emptyTitle={query ? 'Sin coincidencias' : EMPTY_BY_FILTER[filter]}
          emptyDescription={
            query
              ? 'Ningún estudiante de este filtro coincide con la búsqueda.'
              : 'Cambia de filtro para revisar al resto de estudiantes.'
          }
        />
      </section>

      {expired ? (
        <p role="alert" className={pageStyles.error}>
          Esta revisión caducó el {evaluationDateLabel(evaluation.expires_at)}.
          Genera una nueva revisión para poder aplicar las habilitaciones.
        </p>
      ) : null}
      {incomplete ? (
        <p role="alert" className={pageStyles.error}>
          Solo se cargaron {summary.loaded} de {summary.total} resultados.
          Genera una nueva revisión antes de aplicar.
        </p>
      ) : null}
      <div className={`${pageStyles.actions} ${styles.applyBar}`}>
        <button
          type="button"
          className={sharedStyles.primaryButton}
          disabled={applyBlocked}
          onClick={() => setConfirming(true)}
        >
          Aplicar habilitaciones
        </button>
        <button
          type="button"
          className={sharedStyles.secondaryButton}
          disabled={working}
          onClick={onRegenerate}
        >
          Generar nueva revisión
        </button>
      </div>

      {detail ? (
        <ResultDetailDialog
          result={detail}
          criterionLabels={criterionLabels}
          assessmentLabels={assessmentLabels}
          onClose={() => setDetail(null)}
        />
      ) : null}
      {confirming ? (
        <ApplyDialog
          summary={summary}
          working={working}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void apply()}
        />
      ) : null}
    </div>
  )
}
