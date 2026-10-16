import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useCourseOfferings } from '../hooks/useCourseOfferings'
import { useOfferingPeriods } from '../hooks/useOfferingPeriods'
import { CourseOfferingsTable } from './CourseOfferingsTable'
import { OfferingRecordDialog } from './OfferingRecordDialog'
import type { CourseOfferingStatus } from '../types/courseOffering.types'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function CourseOfferingsPanel({
  teacherId,
  editable = false,
  onBusy,
}: {
  teacherId?: number
  editable?: boolean
  onBusy?: (busy: boolean) => void
}) {
  const { state, reload } = useOfferingPeriods()
  if (!state)
    return (
      <p className={styles.state} role="status">
        Cargando periodos académicos…
      </p>
    )
  if (state.status === 'error')
    return (
      <div className={styles.state} role="alert">
        <p>{state.message}</p>
        <button className={styles.secondaryButton} onClick={reload}>
          Reintentar
        </button>
      </div>
    )
  return (
    <OfferingCatalog
      teacherId={teacherId}
      periods={state.periods}
      editable={editable}
      onBusy={onBusy}
      key={teacherId ?? 'all'}
    />
  )
}

function OfferingCatalog({
  teacherId,
  periods,
  editable,
  onBusy,
}: {
  teacherId?: number
  periods: import('@/features/academic-terms/types/academicTerm.types').AcademicTerm[]
  editable: boolean
  onBusy?: (busy: boolean) => void
}) {
  const id = useId()
  const [termId, setTermId] = useState(() => {
    const active = periods.filter((period) => period.status === 'ACTIVE')
    return active.length === 1 ? String(active[0].id) : ''
  })
  const [status, setStatus] = useState<CourseOfferingStatus | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selection, setSelection] = useState<{
    id: number
    mode: 'edit' | 'status'
  } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { state, reload } = useCourseOfferings({
    page,
    search,
    status,
    academic_term_id: termId,
    teacher_id: teacherId,
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
    reload()
  }
  const response = state?.status === 'ready' ? state.response : null
  return (
    <section
      className={styles.card}
      aria-label={teacherId ? 'Materias del docente' : 'Ofertas académicas'}
    >
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {selection && (
        <OfferingRecordDialog
          key={`${selection.id}-${selection.mode}`}
          {...selection}
          periods={periods}
          onClose={() => setSelection(null)}
          onBusy={(busy) => onBusy?.(busy)}
          onSaved={() => {
            setSelection(null)
            setNotice('La oferta se actualizó correctamente.')
            reload()
          }}
        />
      )}
      <form className={styles.searchBar} onSubmit={submit}>
        <label className={styles.filter} htmlFor={`${id}-term`}>
          Periodo académico
          <select
            id={`${id}-term`}
            value={termId}
            onChange={(event) => {
              setTermId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos los periodos</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name}
                {period.status === 'INACTIVE' ? ' — Inactivo' : ' — Activo'}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filter} htmlFor={`${id}-status`}>
          Estado de la oferta
          <select
            id={`${id}-status`}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as CourseOfferingStatus | '')
              setPage(1)
            }}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activa</option>
            <option value="INACTIVE">Inactiva</option>
          </select>
        </label>
        <label className={styles.searchField} htmlFor={`${id}-search`}>
          <span className={styles.srOnly}>
            Buscar materia{!teacherId && ' o docente'}
          </span>
          <input
            id={`${id}-search`}
            value={searchInput}
            maxLength={100}
            placeholder={
              teacherId
                ? 'Buscar por código o nombre de materia'
                : 'Buscar por materia o docente'
            }
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <button type="submit" className={styles.primaryButton}>
          Buscar
        </button>
      </form>
      <p className={styles.hint}>
        Cada oferta corresponde a un docente, una materia y un periodo. Las
        ofertas inactivas conservan su historial.
      </p>
      {!state && (
        <div className={styles.state} role="status">
          Cargando asignaciones…
        </div>
      )}
      {state?.status === 'error' && (
        <div className={styles.state} role="alert">
          <p>{state.message}</p>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={reload}
          >
            Reintentar
          </button>
        </div>
      )}
      {response &&
        (response.data.length ? (
          <CourseOfferingsTable
            offerings={response.data}
            showTeacher={!teacherId}
            onAction={
              editable ? (id, mode) => setSelection({ id, mode }) : undefined
            }
          />
        ) : (
          <div className={styles.state} role="status">
            <h3>No hay asignaciones para esta consulta</h3>
            <p>Revisa el periodo, el estado o la búsqueda seleccionados.</p>
          </div>
        ))}
      {response && (
        <nav
          className={styles.pagination}
          aria-label="Paginación de asignaciones"
        >
          <p>
            {response.meta.total} ofertas · Página {response.meta.current_page}{' '}
            de {response.meta.last_page}
          </p>
          <div>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={page >= response.meta.last_page}
              onClick={() => setPage((value) => value + 1)}
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}
    </section>
  )
}
