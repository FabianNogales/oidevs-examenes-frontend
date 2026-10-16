import { useId, type ReactNode } from 'react'
import type { useEntryControlStudents } from '../hooks/useEntryControlStudents'
import { EntryControlTable } from './EntryControlTable'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import pageStyles from '../pages/TeacherExamsPage.module.css'
import styles from '../pages/EntryControlPage.module.css'

type Props = {
  list: ReturnType<typeof useEntryControlStudents>
  onView: (studentId: number) => void
  roomSelector?: ReactNode
  manual?: boolean
  disabled?: boolean
}

export function EntryControlStudentsList({
  list,
  onView,
  roomSelector,
  manual = false,
  disabled = false,
}: Props) {
  const searchId = useId()
  const titleId = useId()
  const summary = list.response?.summary
  const meta = list.meta

  return (
    <>
      {summary ? (
        <dl
          className={styles.summary}
          aria-label="Resumen de estudiantes del examen"
        >
          <div>
            <dt>Total estudiantes</dt>
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
      ) : null}
      <section className={sharedStyles.section} aria-labelledby={titleId}>
        <h2 id={titleId}>{manual ? 'Registro manual' : 'Estudiantes'}</h2>
        <div className={roomSelector ? styles.filters : styles.manualSearch}>
          <div className={styles.field}>
            <label htmlFor={searchId}>Buscar estudiante</label>
            <input
              id={searchId}
              type="search"
              disabled={disabled}
              value={list.query}
              placeholder="Nombre, apellido, nombre completo, SIS o CI"
              onChange={(event) => list.setQuery(event.target.value)}
            />
          </div>
          {roomSelector}
        </div>
        {list.error ? (
          <section className={pageStyles.state} role="alert">
            <p>{list.error}</p>
            <button type="button" onClick={list.reload}>
              Reintentar
            </button>
          </section>
        ) : null}
        <EntryControlTable
          items={list.items}
          meta={meta}
          loading={list.loading}
          error={list.error}
          onView={onView}
          disabled={disabled}
        />
        {meta ? (
          <nav
            className={styles.pagination}
            aria-label="Paginación de estudiantes"
          >
            <p role="status">
              {meta.total} estudiantes · Página {meta.current_page} de{' '}
              {Math.max(1, meta.last_page)} · {meta.per_page} por página
            </p>
            <div>
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={disabled || list.loading || meta.current_page <= 1}
                onClick={() => list.setPage(meta.current_page - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={
                  disabled ||
                  list.loading ||
                  meta.current_page >= meta.last_page
                }
                onClick={() => list.setPage(meta.current_page + 1)}
              >
                Siguiente
              </button>
            </div>
          </nav>
        ) : null}
      </section>
    </>
  )
}
