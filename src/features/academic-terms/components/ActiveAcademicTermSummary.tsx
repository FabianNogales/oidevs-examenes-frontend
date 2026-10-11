import { useActiveAcademicTerm } from '../hooks/useActiveAcademicTerm'
import { formatAcademicTermDate } from '../utils/academicTermDate'
import styles from '../pages/AdminAcademicTermsPage.module.css'

export function ActiveAcademicTermSummary() {
  const { state, reload } = useActiveAcademicTerm()
  return (
    <aside
      className={styles.activeSummary}
      aria-label="Periodo académico activo"
    >
      {!state && <p role="status">Consultando el periodo activo…</p>}
      {state?.status === 'error' && (
        <div role="alert">
          <p>{state.message}</p>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={reload}
          >
            Reintentar periodo activo
          </button>
        </div>
      )}
      {state?.status === 'ready' &&
        (state.term ? (
          <>
            <p className={styles.eyebrow}>Periodo activo</p>
            <p>
              <strong>{state.term.name}</strong>{' '}
              <span className={styles.activeDates}>
                {formatAcademicTermDate(state.term.start_date)} -{' '}
                {formatAcademicTermDate(state.term.end_date)}
              </span>
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>No hay un periodo activo</strong>
            </p>
            <p className={styles.description}>
              Se necesita un periodo activo para registrar nuevas ofertas
              académicas. La información de periodos anteriores se conserva.
            </p>
          </>
        ))}
    </aside>
  )
}
