import type { EntryControlSummary } from '../types/entryControl.types'
import styles from '../pages/EntryControlPage.module.css'

export function EntryStudentsSummary({
  summary,
  compact = false,
}: {
  summary: EntryControlSummary
  compact?: boolean
}) {
  return (
    <dl
      className={`${styles.summary} ${compact ? styles.compactSummary : ''}`}
      aria-label="Resumen de estudiantes del examen"
    >
      <div>
        <dt>{compact ? 'Total' : 'Total estudiantes'}</dt>
        <dd>{summary.total_students}</dd>
      </div>
      <div>
        <dt>Registrados</dt>
        <dd>{summary.registered}</dd>
      </div>
      <div>
        <dt>Pendientes</dt>
        <dd>{summary.pending}</dd>
      </div>
    </dl>
  )
}
