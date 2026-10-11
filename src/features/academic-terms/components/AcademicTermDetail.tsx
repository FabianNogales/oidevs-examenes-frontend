import { useEffect, useState } from 'react'
import { AcademicTermApiError, getAcademicTerm } from '../api/academicTermsApi'
import type { AcademicTerm } from '../types/academicTerm.types'
import { formatAcademicTermDate } from '../utils/academicTermDate'
import { AcademicTermModal } from './AcademicTermModal'
import { AcademicTermStatusBadge } from './AcademicTermStatusBadge'
import styles from './AcademicTermModal.module.css'

type RecordState =
  | { status: 'ready'; term: AcademicTerm; revision: number }
  | { status: 'error'; message: string; unavailable: boolean; revision: number }

export function AcademicTermDetail({
  termId,
  onClose,
}: {
  termId: number
  onClose: () => void
}) {
  const [state, setState] = useState<RecordState | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getAcademicTerm(termId, controller.signal).then(
      (term) => {
        if (!controller.signal.aborted)
          setState({ status: 'ready', term, revision })
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            revision,
            message:
              error instanceof Error
                ? error.message
                : 'No se pudo consultar el periodo.',
            unavailable:
              error instanceof AcademicTermApiError &&
              [403, 404].includes(error.status ?? 0),
          })
      },
    )
    return () => controller.abort()
  }, [termId, revision])
  const current = state?.revision === revision ? state : null
  return (
    <AcademicTermModal title="Detalle del periodo" onClose={onClose}>
      {!current && (
        <p className={styles.loading} role="status">
          Cargando información del periodo…
        </p>
      )}
      {current?.status === 'error' && (
        <div className={styles.error} role="alert">
          <p>{current.message}</p>
          {!current.unavailable && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setRevision((value) => value + 1)}
            >
              Reintentar detalle
            </button>
          )}
        </div>
      )}
      {current?.status === 'ready' && (
        <dl className={styles.details}>
          <div className={styles.fullWidth}>
            <dt>Nombre del periodo</dt>
            <dd>{current.term.name}</dd>
          </div>
          <div>
            <dt>Fecha de inicio</dt>
            <dd>
              <time dateTime={current.term.start_date}>
                {formatAcademicTermDate(current.term.start_date)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Fecha de fin</dt>
            <dd>
              <time dateTime={current.term.end_date}>
                {formatAcademicTermDate(current.term.end_date)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <AcademicTermStatusBadge status={current.term.status} />
            </dd>
          </div>
        </dl>
      )}
      <footer className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onClose}
        >
          Cerrar
        </button>
      </footer>
    </AcademicTermModal>
  )
}
