import { useEffect, useId, useRef, useState } from 'react'
import { InfoCircleIcon, UserIcon } from '@/features/auth/components/AuthIcons'
import { CollaborationModal as Modal } from '@/features/collaborations/components/CollaborationModal'
import { EligibilityApiError } from '../api/eligibilitiesApi'
import { useEligibilityReasons } from '../hooks/useEligibilityReasons'
import type {
  ExamEligibility,
  EligibilityStatus,
  UpdateEligibilityPayload,
} from '../types/eligibility.types'
import { getEligibilityStudentName } from '../utils/eligibilityDisplay'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from '../pages/Eligibilities.module.css'

type Props = {
  examId: number
  eligibility: ExamEligibility
  onClose: () => void
  onSave: (
    studentId: number,
    payload: UpdateEligibilityPayload,
    signal: AbortSignal,
  ) => Promise<void>
}

export function ManageEligibilityModal({
  examId,
  eligibility,
  onClose,
  onSave,
}: Props) {
  const [status, setStatus] = useState<EligibilityStatus>(eligibility.status)
  const catalog = useEligibilityReasons(examId)
  const [reasonCode, setReasonCode] = useState(eligibility.reason_code ?? '')
  const [observations, setObservations] = useState(eligibility.observations ?? '')
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null)
  const photoUrl = eligibility.profile_photo_url
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const request = useRef<AbortController | null>(null)
  const reasonInput = useRef<HTMLSelectElement>(null)
  const observationsInput = useRef<HTMLTextAreaElement>(null)
  const fieldId = useId()
  const validReason = catalog.items.some((item) => item.code === reasonCode)
  const originalReasonAvailable = catalog.items.some(
    (item) => item.code === eligibility.reason_code,
  )
  const reasonDisabled = busy || catalog.loading || !!catalog.error || !catalog.items.length
  const changed =
    status !== eligibility.status ||
    (status === 'INELIGIBLE' &&
      (reasonCode !== (eligibility.reason_code ?? '') ||
        observations !== (eligibility.observations ?? '')))
  const invalidReason = status === 'INELIGIBLE' && !validReason
  const invalidObservations = status === 'INELIGIBLE' && observations.length > 500

  useEffect(() => () => request.current?.abort(), [])

  function close() {
    if (!request.current) onClose()
  }

  function selectStatus(nextStatus: EligibilityStatus) {
    setStatus(nextStatus)
    setError(null)
    setFieldErrors({})
  }

  async function save() {
    if (request.current || !changed) return
    if (invalidReason) {
      setFieldErrors({ reason_code: 'Selecciona un motivo actual del catálogo.' })
      reasonInput.current?.focus()
      return
    }
    if (invalidObservations) {
      setFieldErrors({ observations: 'Las observaciones admiten hasta 500 caracteres.' })
      observationsInput.current?.focus()
      return
    }
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    setFieldErrors({})
    const payload: UpdateEligibilityPayload =
      status === 'ELIGIBLE'
        ? { status: 'ELIGIBLE' }
        : { status: 'INELIGIBLE', reason_code: reasonCode, observations }
    try {
      await onSave(eligibility.student_id, payload, controller.signal)
    } catch (cause) {
      if (!controller.signal.aborted) {
        if (
          cause instanceof EligibilityApiError &&
          cause.status === 422
        ) {
          setFieldErrors(cause.fieldErrors)
          setError(cause.message)
          if (cause.fieldErrors.reason_code) reasonInput.current?.focus()
          else if (cause.fieldErrors.observations) observationsInput.current?.focus()
        } else {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo guardar la habilitación.',
          )
        }
      }
    } finally {
      if (request.current === controller) request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <div className={styles.manageModal}>
      <Modal title="Gestionar habilitación" onClose={close} busy={busy}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <p className={styles.modalSubtitle}>
            Actualiza el estado de habilitación del estudiante para este examen
          </p>
          <section
            className={styles.studentSummary}
            aria-label="Datos del estudiante"
          >
            <div className={styles.studentAvatar} aria-hidden="true">
              {photoUrl && failedPhotoUrl !== photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  onError={() => setFailedPhotoUrl(photoUrl)}
                />
              ) : (
                <UserIcon />
              )}
            </div>
            <div className={styles.studentDetails}>
              <h3>{getEligibilityStudentName(eligibility)}</h3>
              <dl className={styles.studentIdentifiers}>
                <div>
                  <dt>SIS</dt>
                  <dd>{eligibility.sis_code}</dd>
                </div>
                <div>
                  <dt>CI</dt>
                  <dd>{eligibility.identity_number || 'No informado'}</dd>
                </div>
              </dl>
            </div>
          </section>
          <fieldset className={styles.statusField} disabled={busy}>
            <legend>Estado de habilitación</legend>
            <label
              className={`${styles.radioLabel} ${status === 'ELIGIBLE' ? styles.statusSelected : ''}`}
            >
              <input
                type="radio"
                name={`${fieldId}-status`}
                checked={status === 'ELIGIBLE'}
                onChange={() => selectStatus('ELIGIBLE')}
              />
              <span className={styles.statusText}>
                <strong>Habilitado</strong>
                <span>El estudiante podrá rendir este examen</span>
              </span>
            </label>
            <label
              className={`${styles.radioLabel} ${status === 'INELIGIBLE' ? styles.statusSelected : ''}`}
            >
              <input
                type="radio"
                name={`${fieldId}-status`}
                checked={status === 'INELIGIBLE'}
                onChange={() => selectStatus('INELIGIBLE')}
              />
              <span className={styles.statusText}>
                <strong>Inhabilitado</strong>
                <span>El estudiante no podrá rendir este examen</span>
              </span>
            </label>
          </fieldset>
          {status === 'INELIGIBLE' ? (
            <div className={styles.ineligibilityFields}>
              {!eligibility.reason_code && eligibility.reason ? (
                <div className={styles.historicalReason}>
                  <strong>Motivo histórico</strong>
                  <p>{eligibility.reason}</p>
                  <small>Para guardar una nueva inhabilitación, selecciona un motivo actual.</small>
                </div>
              ) : null}
              <div className={styles.field}>
                <label htmlFor={fieldId}>Motivo de inhabilitación *</label>
                <select
                  id={fieldId}
                  ref={reasonInput}
                  tabIndex={reasonDisabled ? -1 : 0}
                  value={validReason ? reasonCode : ''}
                  required
                  disabled={reasonDisabled}
                  aria-invalid={fieldErrors.reason_code ? true : undefined}
                  aria-describedby={`${fieldId}-hint${fieldErrors.reason_code ? ` ${fieldId}-error` : ''}`}
                  onChange={(event) => {
                    setReasonCode(event.target.value)
                    setFieldErrors({})
                    setError(null)
                  }}
                >
                  <option value="">Selecciona un motivo</option>
                  {catalog.items.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
                <small id={`${fieldId}-hint`} className={sharedStyles.note}>
                  El motivo es obligatorio para inhabilitar al estudiante.
                </small>
                {catalog.loading ? <p role="status">Cargando motivos…</p> : null}
                {catalog.error ? (
                  <div role="alert">
                    <p className={sharedStyles.error}>{catalog.error}</p>
                    <button
                      type="button"
                      className={sharedStyles.secondaryButton}
                      disabled={busy}
                      onClick={() => void catalog.reload()}
                    >Reintentar motivos</button>
                  </div>
                ) : !catalog.loading && !catalog.items.length ? (
                  <p role="status">No hay motivos disponibles. No se puede guardar una inhabilitación.</p>
                ) : !catalog.loading && eligibility.reason_code && !originalReasonAvailable ? (
                  <p className={sharedStyles.note}>El motivo anterior ya no está disponible. Selecciona un motivo actual.</p>
                ) : null}
                {fieldErrors.reason_code ? (
                  <p id={`${fieldId}-error`} className={sharedStyles.error} role="alert">
                    {fieldErrors.reason_code}
                  </p>
                ) : null}
              </div>
              <div className={styles.field}>
                <label htmlFor={`${fieldId}-observations`}>Observaciones</label>
                <textarea
                  id={`${fieldId}-observations`}
                  ref={observationsInput}
                  tabIndex={busy ? -1 : 0}
                  rows={4}
                  maxLength={500}
                  value={observations}
                  disabled={busy}
                  placeholder="Añade información adicional (opcional)..."
                  aria-invalid={fieldErrors.observations || invalidObservations ? true : undefined}
                  aria-describedby={`${fieldId}-counter${fieldErrors.observations || invalidObservations ? ` ${fieldId}-observations-error` : ''}`}
                  onChange={(event) => {
                    setObservations(event.target.value)
                    setFieldErrors({})
                    setError(null)
                  }}
                />
                <small id={`${fieldId}-counter`} className={styles.characterCounter}>
                  {observations.length} / 500
                </small>
                {fieldErrors.observations || invalidObservations ? (
                  <p id={`${fieldId}-observations-error`} className={sharedStyles.error} role="alert">
                    {fieldErrors.observations ?? 'Las observaciones admiten hasta 500 caracteres.'}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className={styles.informationBox}>
            <InfoCircleIcon />
            <p>
              Este estado será utilizado en la identificación y control de ingreso
              del examen.
            </p>
          </div>
          {error ? (
            <p className={sharedStyles.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={sharedStyles.secondaryButton}
              onClick={close}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={sharedStyles.primaryButton}
              disabled={busy || !changed || invalidReason || invalidObservations}
            >
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
