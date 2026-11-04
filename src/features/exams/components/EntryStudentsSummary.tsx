import type { EntryControlSummary } from '../types/entryControl.types'
import styles from '../pages/EntryControlPage.module.css'

export function EntryStudentsSummary({
  summary,
  incidents,
}: {
  summary: EntryControlSummary
  incidents?: number
}) {
  const total = summary.total_students
  const percentage =
    total > 0 ? Math.round((summary.registered / total) * 100) : 0
  return (
    <section
      className={styles.examProgress}
      aria-label="Resumen de estudiantes del examen"
    >
      <div className={styles.progressOverview}>
        <p>
          <strong>
            {summary.registered} de {total} registrados
          </strong>{' '}
          · {percentage}%
        </p>
        <progress
          className={styles.progressBar}
          value={summary.registered}
          max={total || 1}
          aria-label="Progreso de registros"
        />
      </div>
      <p className={styles.progressDetails}>
        {summary.pending} pendientes
        {incidents !== undefined ? <> · {incidents} incidencias</> : null}
      </p>
    </section>
  )
}
