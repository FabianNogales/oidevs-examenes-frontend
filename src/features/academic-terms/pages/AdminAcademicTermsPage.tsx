import { useState } from 'react'
import { Link } from 'react-router'
import { useAcademicTerms } from '../hooks/useAcademicTerms'
import type { AcademicTermsQuery } from '../types/academicTerm.types'
import { AcademicTermsTable } from '../components/AcademicTermsTable'
import { AcademicTermsFilters } from '../components/AcademicTermsFilters'
import { AcademicTermDetail } from '../components/AcademicTermDetail'
import { ActiveAcademicTermSummary } from '../components/ActiveAcademicTermSummary'
import styles from './AdminAcademicTermsPage.module.css'

const INITIAL_QUERY: AcademicTermsQuery = { page: 1, search: '', status: '' }

export function AdminAcademicTermsPage() {
  const [query, setQuery] = useState(INITIAL_QUERY)
  const [detailId, setDetailId] = useState<number | null>(null)
  const { state, reload } = useAcademicTerms(query)
  const meta = state?.status === 'ready' ? state.result.meta : null
  const filtered = Boolean(query.search || query.status)
  function changeQuery(next: AcademicTermsQuery) {
    if (
      next.page === query.page &&
      next.search === query.search &&
      next.status === query.status
    )
      reload()
    else setQuery(next)
  }
  return (
    <section className={styles.page} aria-labelledby="academic-terms-title">
      <div className={styles.container}>
        <Link to="/admin" className={styles.backLink}>
          <span aria-hidden="true">←</span>Volver al inicio
        </Link>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <ol>
            <li>
              <Link to="/admin">Inicio</Link>
            </li>
            <li aria-current="page">Periodos académicos</li>
          </ol>
        </nav>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Administrador</p>
            <h1 id="academic-terms-title" tabIndex={-1}>
              Periodos académicos
            </h1>
            <p className={styles.description}>
              Consulta las gestiones disponibles para organizar las ofertas
              académicas y conservar su historial.
            </p>
          </div>
        </header>
        <ActiveAcademicTermSummary />
        <div className={styles.card}>
          <AcademicTermsFilters query={query} onChange={changeQuery} />
          <div aria-busy={!state}>
            {!state && (
              <div className={styles.state} role="status">
                Cargando periodos académicos…
              </div>
            )}
            {state?.status === 'error' && (
              <div className={styles.state} role="alert">
                <h2>No se pudieron cargar los periodos</h2>
                <p>{state.message}</p>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={reload}
                >
                  Reintentar catálogo
                </button>
              </div>
            )}
            {state?.status === 'ready' &&
              (state.result.data.length ? (
                <AcademicTermsTable
                  terms={state.result.data}
                  onDetail={setDetailId}
                />
              ) : (
                <div className={styles.state} role="status">
                  <h2>
                    {filtered
                      ? 'No se encontraron periodos'
                      : 'No hay periodos registrados'}
                  </h2>
                  <p>
                    {filtered
                      ? 'Prueba otro nombre o cambia el filtro de estado.'
                      : 'Los periodos registrados aparecerán aquí con sus fechas y estado.'}
                  </p>
                </div>
              ))}
          </div>
          {meta && meta.total > 0 && (
            <footer className={styles.pagination}>
              <p aria-live="polite">
                {meta.from}-{meta.to} de {meta.total} periodos
              </p>
              <div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={meta.current_page === 1}
                  onClick={() =>
                    changeQuery({ ...query, page: meta.current_page - 1 })
                  }
                >
                  Anterior
                </button>
                <span>
                  Página {meta.current_page} de {meta.last_page}
                </span>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={meta.current_page === meta.last_page}
                  onClick={() =>
                    changeQuery({ ...query, page: meta.current_page + 1 })
                  }
                >
                  Siguiente
                </button>
              </div>
            </footer>
          )}
        </div>
        {detailId !== null && (
          <AcademicTermDetail
            key={detailId}
            termId={detailId}
            onClose={() => setDetailId(null)}
          />
        )}
      </div>
    </section>
  )
}
