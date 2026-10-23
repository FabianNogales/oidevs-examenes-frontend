import { useEffect, useId, useRef, useState } from 'react'
import { InfoCircleIcon, UserIcon } from '@/features/auth/components/AuthIcons'
import { CollaborationModal as Modal } from '@/features/collaborations/components/CollaborationModal'
import {
  ELIGIBILITY_CONFLICT_MESSAGE,
  EligibilityApiError,
  getExamEligibilities,
} from '../api/eligibilitiesApi'
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
  eligibility: initialEligibility,
  onClose,
  onSave,
}: Props) {
  const [eligibility, setEligibility] = useState(initialEligibility)
  const [status, setStatus] = useState<EligibilityStatus>(eligibility.status)
  const [reason, setReason] = useState(eligibility.reason ?? '')
  const [observations, setObservations] = useState(eligibility.observations ?? '')
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null)
  const photoUrl = eligibility.profile_photo_url
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [conflict, setConflict] = useState(false)
  const [current, setCurrent] = useState<ExamEligibility | null>(null)
  const request = useRef<AbortController | null>(null)
  const reasonInput = useRef<HTMLTextAreaElement>(null)
  const observationsInput = useRef<HTMLTextAreaElement>(null)
  const fieldId = useId()
  const changed =
    status !== eligibility.status ||
    (status === 'INELIGIBLE' &&
      (reason !== (eligibility.reason ?? '') ||
        observations !== (eligibility.observations ?? '')))
  const reasonTooLong = reason.length > 500
  const invalidReason = status === 'INELIGIBLE' && (!reason.trim() || reasonTooLong)
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
    if (request.current || !changed || conflict) return
    if (invalidReason) {
      setFieldErrors({
        reason: reasonTooLong
          ? 'El motivo admite hasta 500 caracteres.'
          : 'Escribe un motivo de inhabilitación.',
      })
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
        ? { status: 'ELIGIBLE', revision: eligibility.revision }
        : { status: 'INELIGIBLE', reason: reason.trim(), observations, revision: eligibility.revision }
    try {
      await onSave(eligibility.student_id, payload, controller.signal)
    } catch (cause) {
      if (!controller.signal.aborted) {
        if (cause instanceof EligibilityApiError && cause.status === 409) {
          setConflict(true)
          setCurrent(null)
        } else if (
          cause instanceof EligibilityApiError &&
          cause.status === 422
        ) {
          setFieldErrors(cause.fieldErrors)
          setError(cause.message)
          if (cause.fieldErrors.reason) reasonInput.current?.focus()
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

  async function loadCurrent() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    setCurrent(null)
    try {
      const rows = await getExamEligibilities(examId, controller.signal)
      if (controller.signal.aborted) return
      const row = rows.find((item) => item.student_id === eligibility.student_id)
      if (!row) throw new Error('La habilitación ya no está disponible para tu cuenta.')
      // Show the complete server snapshot first; keep the draft and its original revision.
      setCurrent(row)
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'No se pudieron consultar los datos actuales.')
      }
    } finally {
      if (request.current === controller) request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function applyCurrent() {
    if (!current || request.current) return
    // This explicit discard replaces every editable value together with its revision.
    setEligibility(current)
    setStatus(current.status)
    setReason(current.reason ?? '')
    setObservations(current.observations ?? '')
    setFieldErrors({})
    setError(null)
    setConflict(false)
    setCurrent(null)
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
          <p className={sharedStyles.note}>Revisión del formulario: {eligibility.revision}</p>
          {conflict ? (
            <section aria-label="Conflicto de habilitación">
              <p className={sharedStyles.error} role="alert">{ELIGIBILITY_CONFLICT_MESSAGE}</p>
              <button type="button" className={sharedStyles.secondaryButton} disabled={busy}
                onClick={() => void loadCurrent()}>
                Consultar datos actuales
              </button>
              {current ? (
                <div className={styles.historicalReason}>
                  <strong>Datos actuales del servidor — Revisión {current.revision}</strong>
                  <dl>
                    <dt>Estado</dt><dd>{current.status === 'ELIGIBLE' ? 'Habilitado' : 'Inhabilitado'}</dd>
                    <dt>Motivo</dt><dd>{current.reason ?? 'Sin motivo'}</dd>
                    <dt>Observaciones</dt><dd>{current.observations ?? 'Sin observaciones'}</dd>
                    <dt>Evaluado por</dt><dd>{current.evaluated_by ?? 'No informado'}</dd>
                    <dt>Fecha de evaluación</dt><dd>{current.evaluated_at ?? 'No informada'}</dd>
                  </dl>
                  <p>Tu borrador se conserva hasta que decidas descartarlo.</p>
                  <button type="button" className={sharedStyles.secondaryButton} disabled={busy} onClick={applyCurrent}>
                    Descartar borrador y cargar estos datos
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}
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
              <div className={styles.field}>
                <label htmlFor={fieldId}>Motivo de inhabilitación *</label>
                <textarea
                  id={fieldId}
                  ref={reasonInput}
                  tabIndex={busy ? -1 : 0}
                  rows={3}
                  maxLength={500}
                  value={reason}
                  required
                  disabled={busy}
                  placeholder="Describe el motivo de inhabilitación..."
                  aria-invalid={fieldErrors.reason || reasonTooLong ? true : undefined}
                  aria-describedby={`${fieldId}-hint ${fieldId}-reason-counter${fieldErrors.reason || reasonTooLong ? ` ${fieldId}-error` : ''}`}
                  onChange={(event) => {
                    setReason(event.target.value)
                    setFieldErrors({})
                    setError(null)
                  }}
                />
                <small id={`${fieldId}-hint`} className={sharedStyles.note}>
                  El motivo es obligatorio para inhabilitar al estudiante.
                </small>
                <small id={`${fieldId}-reason-counter`} className={styles.characterCounter}>
                  {reason.length} / 500
                </small>
                {fieldErrors.reason || reasonTooLong ? (
                  <p id={`${fieldId}-error`} className={sharedStyles.error} role="alert">
                    {fieldErrors.reason ?? 'El motivo admite hasta 500 caracteres.'}
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
              disabled={busy || conflict || !changed || invalidReason || invalidObservations}
            >
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
