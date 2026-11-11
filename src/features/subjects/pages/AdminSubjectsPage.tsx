import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { useCallback, useState, type FormEvent } from 'react'
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
import { Button } from '@/shared/components/ui/Button/Button'
import { ButtonLink } from '@/shared/components/ui/Button/ButtonLink'

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
    <PageContainer labelledBy="subjects-title">
      <PageHeader
        title="Gestión de materias"
        titleId="subjects-title"
        focusableTitle
        eyebrow="Administrador"
        description="Consulta y administra el catálogo de materias por carrera."
        breadcrumbs={[
          { label: 'Inicio', to: '/admin' },
          { label: 'Materias' },
          { label: 'Gestionar materias' },
        ]}
        actions={
          <>
            <ButtonLink to="/admin/subjects/import">
              + Importar materias (CSV)
            </ButtonLink>
            <Button
              variant="secondary"
              onClick={() => setSelection({ mode: 'create' })}
            >
              + Registrar materia
            </Button>
          </>
        }
      />
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
          <Button type="submit">
            Buscar
          </Button>
          {filtered && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                changeQuery(INITIAL_QUERY)
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </form>
        {careers.error && (
          <div className={styles.state} role="alert">
            <p>
              {careers.error} Puedes consultar el catálogo sin filtrar por
              carrera.
            </p>
            <Button
              variant="secondary"
              onClick={careers.reload}
            >
              Reintentar carreras
            </Button>
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
              <Button
                onClick={catalog.reload}
              >
                Reintentar
              </Button>
            </div>
          )}
          {catalog.status === 'ready' &&
            (catalog.result.data.length ? (
              <AdminSubjectsTable
                subjects={catalog.result.data}
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
              <Button
                variant="secondary"
                disabled={meta.current_page <= 1}
                onClick={() =>
                  changeQuery({ ...query, page: meta.current_page - 1 })
                }
              >
                Anterior
              </Button>
              <span>
                Página {meta.current_page} de {meta.last_page}
              </span>
              <Button
                variant="secondary"
                disabled={meta.current_page >= meta.last_page}
                onClick={() =>
                  changeQuery({ ...query, page: meta.current_page + 1 })
                }
              >
                Siguiente
              </Button>
            </div>
          </nav>
        )}
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
    </PageContainer>
  )
}
