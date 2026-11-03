import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { changeInfractionStatus } from '../api/infractionsApi'
import { useInfractionMutation } from '../hooks/useInfractionMutation'
import {
  INFRACTION_STATUS_LABELS,
  validateInfractionChange,
} from '../utils/infractionValidation'
import type {
  ChangeInfractionStatusPayload,
  InfractionDetail,
  InfractionStatus,
} from '../types/infraction.types'
import { InfractionMutationGuard } from './InfractionMutationGuard'
import formStyles from '@/features/incidents/components/IncidentForm.module.css'
import styles from './InfractionManagement.module.css'

export function InfractionStatusForm({
  detail,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  detail: InfractionDetail
  onSaved: (value: InfractionDetail) => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const notified = useRef(false)
  const [status, setStatus] = useState<InfractionStatus | ''>('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const request = useInfractionMutation(
    (payload: ChangeInfractionStatusPayload) =>
      changeInfractionStatus(detail.data.exam_id, detail, payload),
    (payload) => validateInfractionChange(detail.data, payload),
  )
  useEffect(() => {
    onBusyChange(request.busy)
  }, [onBusyChange, request.busy])
  useEffect(() => {
    if (request.saved && !notified.current) {
      notified.current = true
      onSaved(request.saved)
    }
  }, [request.saved, onSaved])
  useEffect(() => {
    if (Object.keys(request.fieldErrors).length)
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [request.fieldErrors])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await request.submit({
      status: status as InfractionStatus,
      reason,
      confirmed,
    })
  }
  if (
    !detail.data.permissions.can_update ||
    !detail.data.permissions.allowed_statuses.length
  )
    return (
      <p role="alert">
        No hay cambios de estado autorizados para este registro.
      </p>
    )
  const disabled = request.busy || request.needsRefresh || !!request.saved
  return (
    <form
      ref={form}
      className={formStyles.panel}
      onSubmit={submit}
      noValidate
      aria-busy={request.busy}
    >
      <InfractionMutationGuard busy={request.busy} />
      <h2>Actualizar estado</h2>
      <p>
        Estado vigente:{' '}
        <strong>{INFRACTION_STATUS_LABELS[detail.data.status]}</strong>. La
        decisión conservará autor, fecha y justificación.
      </p>
      <div className={formStyles.field}>
        <label htmlFor={`${id}-status`}>Nuevo estado *</label>
        <select
          id={`${id}-status`}
          value={status}
          disabled={disabled}
          aria-invalid={!!request.fieldErrors.status}
          aria-describedby={
            request.fieldErrors.status ? `${id}-status-error` : undefined
          }
          onChange={(event) =>
            setStatus(event.target.value as InfractionStatus | '')
          }
        >
          <option value="">Selecciona una operación autorizada</option>
          {detail.data.permissions.allowed_statuses.map((value) => (
            <option key={value} value={value}>
              {INFRACTION_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        {request.fieldErrors.status && (
          <p id={`${id}-status-error`} className={formStyles.error}>
            {request.fieldErrors.status}
          </p>
        )}
      </div>
      <div className={formStyles.field}>
        <label htmlFor={`${id}-reason`}>Justificación del cambio *</label>
        <textarea
          id={`${id}-reason`}
          rows={4}
          value={reason}
          disabled={disabled}
          aria-invalid={!!request.fieldErrors.reason}
          aria-describedby={
            request.fieldErrors.reason ? `${id}-reason-error` : undefined
          }
          onChange={(event) => setReason(event.target.value)}
        />
        {request.fieldErrors.reason && (
          <p id={`${id}-reason-error`} className={formStyles.error}>
            {request.fieldErrors.reason}
          </p>
        )}
      </div>
      <label className={styles.confirm}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={disabled}
          aria-invalid={!!request.fieldErrors.confirmed}
          aria-describedby={
            request.fieldErrors.confirmed ? `${id}-confirmed-error` : undefined
          }
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>
          Confirmo la decisión y su justificación para esta infracción.
        </span>
      </label>
      {request.fieldErrors.confirmed && (
        <p id={`${id}-confirmed-error`} className={formStyles.error}>
          {request.fieldErrors.confirmed}
        </p>
      )}
      {request.error && (
        <p role="alert" className={formStyles.error}>
          {request.error}
        </p>
      )}
      {request.needsRefresh && (
        <p role="status">
          Consulta el detalle actualizado antes de realizar otra operación.
        </p>
      )}
      <div className={formStyles.actions}>
        <button type="button" disabled={request.busy} onClick={onCancel}>
          {request.needsRefresh
            ? 'Consultar detalle actualizado'
            : 'Cancelar cambio'}
        </button>
        <button type="submit" disabled={disabled}>
          {request.busy ? 'Guardando…' : 'Confirmar cambio de estado'}
        </button>
      </div>
    </form>
  )
}
