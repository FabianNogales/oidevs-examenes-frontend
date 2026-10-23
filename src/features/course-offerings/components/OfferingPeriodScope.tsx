import { useId } from 'react'
import type { ReactNode } from 'react'
import type { AcademicTerm } from '@/features/academic-terms/types/academicTerm.types'
import { useActiveAcademicTerm } from '@/features/academic-terms/hooks/useActiveAcademicTerm'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function OfferingPeriodScope({
  children,
}: {
  children: (term: AcademicTerm) => ReactNode
}) {
  const { state, reload } = useActiveAcademicTerm()
  const id = useId()
  if (!state) return <p role="status">Cargando periodo académico…</p>
  if (state.status === 'error')
    return (
      <div className={styles.error} role="alert">
        <p>{state.message}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={reload}
        >
          Reintentar
        </button>
      </div>
    )
  if (!state.term)
    return (
      <div className={styles.notice} role="status">
        <p>
          No hay un periodo activo. Activa uno en Periodos académicos antes de
          asignar materias.
        </p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={reload}
        >
          Actualizar periodo
        </button>
      </div>
    )
  return (
    <>
      <div className={styles.periodField}>
        <label htmlFor={id}>Periodo académico</label>
        <input
          id={id}
          value={state.term.name}
          readOnly
          aria-describedby={`${id}-help`}
        />
        <small id={`${id}-help`}>
          Las asignaciones se guardarán en este periodo activo.
        </small>
      </div>
      {children(state.term)}
    </>
  )
}
