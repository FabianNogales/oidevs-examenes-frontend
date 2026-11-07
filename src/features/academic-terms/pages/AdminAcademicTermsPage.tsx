import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { useAcademicTerms } from '../hooks/useAcademicTerms'
import type {
  AcademicTerm,
  AcademicTermSelection,
  AcademicTermsQuery,
  AcademicTermStatus,
} from '../types/academicTerm.types'
import type { AuthNotice } from '@/features/auth/types/auth'
import { Snackbar } from '@/shared/components/Snackbar'
import { AcademicTermsTable } from '../components/AcademicTermsTable'
import { AcademicTermsFilters } from '../components/AcademicTermsFilters'
import { AcademicTermDialog } from '../components/AcademicTermDialog'
import { AcademicTermStatusDialog } from '../components/AcademicTermStatusDialog'
import { ActiveAcademicTermSummary } from '../components/ActiveAcademicTermSummary'
import styles from './AdminAcademicTermsPage.module.css'

const INITIAL_QUERY: AcademicTermsQuery = { page: 1, search: '', status: '' }

export function AdminAcademicTermsPage() {
  const [query, setQuery] = useState(INITIAL_QUERY)
  const [selection, setSelection] = useState<AcademicTermSelection | null>(null)
  const [notice, setNotice] = useState<AuthNotice | null>(null)
  const [activeRevision, setActiveRevision] = useState(0)
  const [statusSelection, setStatusSelection] = useState<{
    termId: number
    targetStatus: AcademicTermStatus
  } | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const { state, reload } = useAcademicTerms(query)
  const meta = state?.status === 'ready' ? state.result.meta : null
  const filtered = Boolean(query.search || query.status)
  function refresh() {
    reload()
    setActiveRevision((value) => value + 1)
  }
  function saved(term: AcademicTerm, created: boolean, statusChanged = false) {
    setSelection(null)
    setStatusSelection(null)
    setNotice({
      id: Date.now(),
      type: 'success',
      message: `Periodo ${term.name} ${statusChanged ? (term.status === 'ACTIVE' ? 'activado' : 'desactivado') : created ? 'registrado' : 'actualizado'} correctamente.`,
    })
    if (query.page !== 1) setQuery({ ...query, page: 1 })
    else reload()
    setActiveRevision((value) => value + 1)
  }
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
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/admin' },
            { label: 'Periodos académicos' },
          ]}
        />
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
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setSelection({ mode: 'create' })}
          >
            + Registrar periodo
          </button>
        </header>
        <ActiveAcademicTermSummary key={activeRevision} />
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
                  onEdit={(termId) => setSelection({ mode: 'edit', termId })}
                  onStatus={(term) =>
                    setStatusSelection({
                      termId: term.id,
                      targetStatus:
                        term.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                    })
                  }
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
        {selection !== null && (
          <AcademicTermDialog
            key={
              selection.mode === 'create'
                ? 'create'
                : `${selection.mode}:${selection.termId}`
            }
            selection={selection}
            onClose={() => setSelection(null)}
            onSaved={saved}
          />
        )}
        {statusSelection !== null && (
          <AcademicTermStatusDialog
            key={`${statusSelection.termId}:${statusSelection.targetStatus}`}
            {...statusSelection}
            onClose={() => setStatusSelection(null)}
            onSaved={(term) => saved(term, false, true)}
            onRefresh={refresh}
          />
        )}
      </div>
      <Snackbar notice={notice} onDismiss={dismissNotice} />
    </section>
  )
}
