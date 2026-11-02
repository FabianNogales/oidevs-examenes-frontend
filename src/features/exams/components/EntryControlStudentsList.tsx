import { useId } from 'react'
import type { useEntryControlStudents } from '../hooks/useEntryControlStudents'
import type { EntryControlFilter } from '../types/entryControl.types'
import { EntryControlTable } from './EntryControlTable'
import { canRegisterEntryManually } from '../utils/entryManualEligibility'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import pageStyles from '../pages/TeacherExamsPage.module.css'
import styles from '../pages/EntryControlPage.module.css'

type Props = {
  list: ReturnType<typeof useEntryControlStudents>
  onView: (studentId: number) => void
  onFilterChange?: (filter: EntryControlFilter) => void
  manual?: boolean
  disabled?: boolean
}

const STUDENT_FILTERS: { value: EntryControlFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'registered', label: 'Registrados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'incidents', label: 'Incidencias' },
]

export function EntryControlStudentsList({
  list,
  onView,
  onFilterChange,
  manual = false,
  disabled = false,
}: Props) {
  const searchId = useId()
  const filterHelpId = useId()
  const meta = list.meta
  const filterHelp =
    manual
      ? null
      : list.filter === 'incidents'
      ? 'Estudiantes inactivos, sin habilitación evaluada o inhabilitados. Pueden aparecer también en otros grupos.'
      : list.query.trim()
        ? 'Los contadores corresponden a la búsqueda actual.'
        : null

  return (
    <>
      <section
        className={sharedStyles.section}
        aria-label={
          manual
            ? 'Estudiantes para registro manual'
            : 'Consulta de estudiantes'
        }
      >
        <div className={styles.studentToolbar}>
          <div className={styles.field}>
            <label htmlFor={searchId}>Buscar estudiante</label>
            <input
              id={searchId}
              type="search"
              disabled={disabled}
              value={list.query}
              placeholder="Nombre, apellido, SIS o CI"
              onChange={(event) => list.setQuery(event.target.value)}
            />
          </div>
          {!manual ? (
            <div
              className={styles.studentFilters}
              role="group"
              aria-label="Filtrar estudiantes por ingreso"
              aria-describedby={filterHelp ? filterHelpId : undefined}
              aria-busy={list.loading}
            >
              {STUDENT_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={list.filter === value}
                  disabled={disabled}
                  onClick={() => (onFilterChange ?? list.setFilter)(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {filterHelp ? (
          <p id={filterHelpId} className={sharedStyles.note}>
            {filterHelp}
          </p>
        ) : null}
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
          manual={manual}
          canRegister={
            manual
              ? (student) =>
                  list.response?.exam.entry_available === true &&
                  canRegisterEntryManually(student, list.roomId)
              : undefined
          }
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
