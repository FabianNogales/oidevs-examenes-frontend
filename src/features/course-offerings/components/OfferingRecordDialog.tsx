import { useEffect, useRef, useState } from 'react'
import type { AcademicTerm } from '@/features/academic-terms/types/academicTerm.types'
import type { CourseOffering } from '../types/courseOffering.types'
import {
  getCourseOffering,
  updateCourseOfferingStatus,
  mapOfferingMutationError,
} from '../api/offeringMutationsApi'
import { OfferingModal } from './OfferingModal'
import { OfferingEditForm } from './OfferingEditForm'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function OfferingRecordDialog({
  id,
  mode,
  periods,
  onClose,
  onSaved,
  onBusy,
}: {
  id: number
  mode: 'edit' | 'status'
  periods: AcademicTerm[]
  onClose: () => void
  onSaved: () => void
  onBusy: (busy: boolean) => void
}) {
  const [state, setState] = useState<{
    offering?: CourseOffering
    error?: string
  } | null>(null)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    getCourseOffering(id, controller.signal).then(
      (offering) => {
        if (!controller.signal.aborted) setState({ offering })
      },
      (cause: unknown) => {
        if (!controller.signal.aborted)
          setState({ error: mapOfferingMutationError(cause).message })
      },
    )
    return () => controller.abort()
  }, [id, revision])
  function changeBusy(value: boolean) {
    pending.current = value
    setBusy(value)
    onBusy(value)
  }
  function close() {
    if (!pending.current) onClose()
  }
  async function changeStatus() {
    if (pending.current || !state?.offering) return
    const offering = state.offering
    changeBusy(true)
    setError(null)
    try {
      await updateCourseOfferingStatus(
        offering.id,
        offering.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      )
      onSaved()
    } catch (cause) {
      const failure = mapOfferingMutationError(cause)
      setError(
        [failure.message, ...new Set(Object.values(failure.fields))].join(' '),
      )
    } finally {
      changeBusy(false)
    }
  }
  const offering = state?.offering
  const canActivate =
    offering &&
    offering.teacher.status === 'ACTIVE' &&
    offering.subject.status === 'ACTIVE' &&
    offering.academic_term.status === 'ACTIVE'
  return (
    <OfferingModal
      title={
        mode === 'edit'
          ? 'Editar oferta académica'
          : offering?.status === 'ACTIVE'
            ? 'Desactivar oferta académica'
            : 'Activar oferta académica'
      }
      busy={busy}
      onClose={close}
    >
      {!state && <p role="status">Cargando oferta…</p>}
      {state?.error && (
        <div className={styles.error} role="alert">
          <p>{state.error}</p>
          <button
            type="button"
            onClick={() => {
              setState(null)
              setRevision((value) => value + 1)
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {offering && mode === 'edit' && (
        <OfferingEditForm
          offering={offering}
          periods={periods}
          onBusy={changeBusy}
          onSaved={onSaved}
          onCancel={close}
        />
      )}
      {offering && mode === 'status' && (
        <>
          <p>
            <strong>{offering.subject.name}</strong> ·{' '}
            {offering.teacher.first_names} {offering.teacher.last_names} ·{' '}
            {offering.academic_term.name}
          </p>
          <p className={styles.notice}>
            Cambiar el estado conserva la oferta, sus{' '}
            {offering.enrollments_count} inscripciones y {offering.exams_count}{' '}
            exámenes. No se eliminarán registros.
          </p>
          {offering.status === 'INACTIVE' && !canActivate && (
            <p className={styles.error}>
              Para activar esta oferta, el docente, la materia y el periodo
              deben estar activos.
            </p>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy}
              onClick={close}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={
                busy || (offering.status === 'INACTIVE' && !canActivate)
              }
              onClick={() => void changeStatus()}
            >
              {busy
                ? 'Procesando…'
                : offering.status === 'ACTIVE'
                  ? 'Desactivar oferta'
                  : 'Activar oferta'}
            </button>
          </div>
        </>
      )}
    </OfferingModal>
  )
}
