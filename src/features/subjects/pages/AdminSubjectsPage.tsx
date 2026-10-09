import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Snackbar } from '@/shared/components/Snackbar'
import type { AuthNotice } from '@/features/auth/types/auth'
import { SubjectDialog } from '../components/SubjectDialog'
import { SubjectStatusDialog } from '../components/SubjectStatusDialog'
import { AdminSubjectsTable } from '../components/AdminSubjectsTable'
import { useAdminSubjects, useSubjectCareers } from '../hooks/useAdminSubjects'
import type {
  AdminSubject,
  SubjectDialogSelection,
  SubjectsQuery,
  SubjectStatus,
} from '../types/adminSubject.types'
import styles from './AdminSubjectsPage.module.css'

const INITIAL_QUERY: SubjectsQuery = {
  page: 1,
  search: '',
  status: '',
  career_id: '',
}

export function AdminSubjectsPage() {
  const [query, setQuery] = useState<SubjectsQuery>(INITIAL_QUERY)
  const [search, setSearch] = useState('')
  const catalog = useAdminSubjects(query)
  const careers = useSubjectCareers()
  const [selection, setSelection] = useState<SubjectDialogSelection | null>(
    null,
  )
  const [statusSubject, setStatusSubject] = useState<AdminSubject | null>(null)
  const [notice, setNotice] = useState<AuthNotice | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])
  function saved(subject: AdminSubject, created: boolean) {
    setSelection(null)
    setNotice({
      id: Date.now(),
      type: 'success',
      message: `Materia ${subject.code} ${created ? 'registrada' : 'actualizada'} correctamente.`,
    })
    if (query.page > 1) changeQuery({ ...query, page: 1 })
    else catalog.reload()
  }
  function statusChanged(subject: AdminSubject) {
    setStatusSubject(null)
    setNotice({
      id: Date.now(),
      type: 'success',
      message: `Materia ${subject.code} ${subject.status === 'ACTIVE' ? 'activada' : 'desactivada'} correctamente.`,
    })
    if (query.status && query.page > 1 && catalog.result?.data.length === 1)
      changeQuery({ ...query, page: query.page - 1 })
    else catalog.reload()
  }
  function changeQuery(next: SubjectsQuery) {
    if (JSON.stringify(next) === JSON.stringify(query)) {
      catalog.reload()
      return
    }
    catalog.markLoading()
    setQuery(next)
  }
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    changeQuery({ ...query, search: search.trim(), page: 1 })
  }
  const filtered = Boolean(query.search || query.status || query.career_id)
  const meta = catalog.result?.meta
  return (
    <section className={styles.page} aria-labelledby="subjects-title">
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Administrador</p>
            <h1 id="subjects-title" tabIndex={-1}>
              Gestión de materias
            </h1>
            <p className={styles.description}>
              Consulta y administra el catálogo de materias por carrera.
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link to="/admin/subjects/import" className={styles.primaryButton}>
              + Importar materias (CSV)
            </Link>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setSelection({ mode: 'create' })}
            >
              + Registrar materia
            </button>
          </div>
        </header>
        <div className={styles.card}>
          <form
            className={styles.searchBar}
            onSubmit={handleSearch}
            role="search"
            aria-label="Buscar materias"
          >
            <div className={styles.searchField}>
              <label className={styles.srOnly} htmlFor="subjects-search">
                Buscar por nombre o código de materia
              </label>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5" />
              </svg>
              <input
                id="subjects-search"
                type="search"
                maxLength={150}
                value={search}
                placeholder="Buscar por nombre o código de materia"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <label className={styles.filter}>
              Carrera
              <select
                value={query.career_id}
                disabled={!careers.loaded || Boolean(careers.error)}
                onChange={(event) =>
                  changeQuery({
                    ...query,
                    career_id: event.target.value,
                    page: 1,
                  })
                }
              >
                <option value="">
                  {careers.loaded ? 'Todas las carreras' : 'Cargando carreras…'}
                </option>
                {careers.careers.map((career) => (
                  <option value={career.id} key={career.id}>
                    {career.name}
                    {career.status === 'INACTIVE' ? ' (inactiva)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filter}>
              Estado
              <select
                value={query.status}
                onChange={(event) =>
                  changeQuery({
                    ...query,
                    status: event.target.value as SubjectStatus | '',
                    page: 1,
                  })
                }
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </label>
            <button className={styles.primaryButton} type="submit">
              Buscar
            </button>
            {filtered && (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => {
                  setSearch('')
                  changeQuery(INITIAL_QUERY)
                }}
              >
                Limpiar filtros
              </button>
            )}
          </form>
          {careers.error && (
            <div className={styles.state} role="alert">
              <p>
                {careers.error} Puedes consultar el catálogo sin filtrar por
                carrera.
              </p>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={careers.reload}
              >
                Reintentar carreras
              </button>
            </div>
          )}
          <div aria-busy={catalog.status === 'loading'}>
            {catalog.status === 'loading' && (
              <div className={styles.state} role="status">
                Cargando materias…
              </div>
            )}
            {catalog.status === 'error' && (
              <div className={styles.state} role="alert">
                <h2>No se pudo cargar el catálogo</h2>
                <p>{catalog.error}</p>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={catalog.reload}
                >
                  Reintentar
                </button>
              </div>
            )}
            {catalog.status === 'ready' &&
              (catalog.result.data.length ? (
                <AdminSubjectsTable
                  subjects={catalog.result.data}
                  onDetail={(subjectId) =>
                    setSelection({ mode: 'detail', subjectId })
                  }
                  onEdit={(subjectId) =>
                    setSelection({ mode: 'edit', subjectId })
                  }
                  onStatusChange={setStatusSubject}
                />
              ) : (
                <div className={styles.state} role="status">
                  <h2>
                    {filtered
                      ? 'No se encontraron materias'
                      : 'No hay materias registradas'}
                  </h2>
                  <p>
                    {filtered
                      ? 'Prueba con otro nombre, código, carrera o estado.'
                      : 'Las materias registradas aparecerán aquí.'}
                  </p>
                </div>
              ))}
          </div>
          {catalog.status === 'ready' && meta && meta.total > 0 && (
            <nav
              className={styles.pagination}
              aria-label="Paginación de materias"
            >
              <p role="status">
                {meta.from ?? 0}–{meta.to ?? 0} de {meta.total} materias
              </p>
              <div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={meta.current_page <= 1}
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
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() =>
                    changeQuery({ ...query, page: meta.current_page + 1 })
                  }
                >
                  Siguiente
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>
      {selection && (
        <SubjectDialog
          key={
            selection.mode === 'create'
              ? 'create'
              : `${selection.mode}-${selection.subjectId}`
          }
          selection={selection}
          onClose={() => setSelection(null)}
          onSaved={saved}
        />
      )}
      {statusSubject && (
        <SubjectStatusDialog
          subject={statusSubject}
          onClose={() => setStatusSubject(null)}
          onChanged={statusChanged}
        />
      )}
      <Snackbar notice={notice} onDismiss={dismissNotice} />
    </section>
  )
}
