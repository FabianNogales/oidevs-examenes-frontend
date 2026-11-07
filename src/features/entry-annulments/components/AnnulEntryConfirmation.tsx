import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { entryStudentName } from '@/features/exams/utils/entryControlDisplay'
import type { AnnulmentHistoryRecord } from '../types/entryAnnulment.types'
import { canAnnulEntry } from '../utils/entryAnnulmentValidation'
import { useEntryAnnulment } from '../hooks/useEntryAnnulment'
import { PendingAnnulmentGuard } from './PendingAnnulmentGuard'
import styles from './AnnulEntryConfirmation.module.css'

type Props = {
  examId: number
  record: AnnulmentHistoryRecord
  onCancel: () => void
  onAnnulled: (record: AnnulmentHistoryRecord) => void
  onBusyChange?: (busy: boolean) => void
}

export function AnnulEntryConfirmation({
  examId,
  record,
  onCancel,
  onAnnulled,
  onBusyChange,
}: Props) {
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const request = useEntryAnnulment(examId, record)
  const notified = useRef(false)
  const submitting = useRef(false)

  useEffect(() => {
    onBusyChange?.(request.busy)
  }, [onBusyChange, request.busy])
  useEffect(() => {
    if (request.saved && !notified.current) {
      notified.current = true
      onAnnulled(request.saved)
    }
  }, [request.saved, onAnnulled])
  useEffect(() => {
    if (Object.keys(request.fieldErrors).length)
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [request.fieldErrors])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    try {
      await request.submit({ reason, confirmed })
    } finally {
      submitting.current = false
    }
  }

  if (!canAnnulEntry(record))
    return (
      <p role="alert">
        Este ingreso no está autorizado para anulación. Actualiza el historial.
      </p>
    )

  return (
    <form
      ref={form}
      className={styles.form}
      onSubmit={submit}
      noValidate
      aria-busy={request.busy}
    >
      <PendingAnnulmentGuard busy={request.busy} />
      <h3>Anular ingreso #{record.entry.id}</h3>
      <p>
        El ingreso original se conservará en el historial y dejará de contar
        como asistencia válida. Un nuevo ingreso deberá cumplir nuevamente las
        condiciones vigentes.
      </p>
      <dl className={styles.summary}>
        <div>
          <dt>Estudiante</dt>
          <dd>{entryStudentName(record.student)}</dd>
        </div>
        <div>
          <dt>SIS</dt>
          <dd>{record.student.sis_code}</dd>
        </div>
        <div>
          <dt>Ingreso original · hora de Bolivia</dt>
          <dd>
            {new Date(record.entry.entered_at).toLocaleString('es-BO', {
              timeZone: 'America/La_Paz',
              hour12: false,
            })}
          </dd>
        </div>
        <div>
          <dt>Método</dt>
          <dd>{record.entry.verification_method}</dd>
        </div>
        <div>
          <dt>Registrado por</dt>
          <dd>{record.entry.verified_by_name}</dd>
        </div>
      </dl>
      <div className={styles.field}>
        <label htmlFor={`${id}-reason`}>Motivo de la anulación *</label>
        <textarea
          id={`${id}-reason`}
          rows={4}
          value={reason}
          disabled={request.busy || request.needsRefresh || !!request.saved}
          required
          aria-invalid={!!request.fieldErrors.reason}
          aria-describedby={
            request.fieldErrors.reason ? `${id}-reason-error` : undefined
          }
          onChange={(event) => setReason(event.target.value)}
        />
        {request.fieldErrors.reason && (
          <p id={`${id}-reason-error`} className={styles.error}>
            {request.fieldErrors.reason}
          </p>
        )}
      </div>
      <label className={styles.confirm}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={request.busy || request.needsRefresh || !!request.saved}
          aria-invalid={!!request.fieldErrors.confirmed}
          aria-describedby={
            request.fieldErrors.confirmed ? `${id}-confirm-error` : undefined
          }
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>
          Confirmo que deseo anular este ingreso conservando su evidencia
          original.
        </span>
      </label>
      {request.fieldErrors.confirmed && (
        <p id={`${id}-confirm-error`} className={styles.error}>
          {request.fieldErrors.confirmed}
        </p>
      )}
      {request.error && (
        <p role="alert" className={styles.error}>
          {request.error}
        </p>
      )}
      {request.needsRefresh && (
        <p role="status">
          Vuelve al historial y actualízalo antes de intentar otra operación.
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          disabled={request.busy}
          onClick={() => {
            if (!submitting.current) onCancel()
          }}
        >
          {request.needsRefresh ? 'Volver al historial' : 'Conservar ingreso'}
        </button>
        <button
          type="submit"
          disabled={request.busy || request.needsRefresh || !!request.saved}
        >
          {request.busy ? 'Anulando…' : 'Confirmar anulación'}
        </button>
      </div>
    </form>
  )
}
