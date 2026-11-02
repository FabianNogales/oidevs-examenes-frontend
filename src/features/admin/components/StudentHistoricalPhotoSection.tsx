import { useEffect, useId, useRef, useState } from 'react'
import {
  correctHistoricalPhoto,
  getAdminStudent,
  HistoricalPhotoApiError,
  uploadHistoricalPhoto,
} from '../api/adminStudentsApi'
import type {
  HistoricalPhotoFieldErrors,
  StudentDetail,
} from '../types/student.types'
import {
  HISTORICAL_PHOTO_ACCEPT,
  validateHistoricalPhoto,
} from '../utils/historicalPhotoValidation'
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage/AuthenticatedImage'
import { ConfirmDialog } from './ConfirmDialog'
import layoutStyles from '../profile/components/EntityProfileLayout.module.css'
import styles from './StudentHistoricalPhotoSection.module.css'

type Confirmation = {
  photo: File
  revision: number
  correction: boolean
  reason: string
}

// Mounted only by the existing AdminRoute-protected student detail page.
export function StudentHistoricalPhotoSection({
  student,
  onUpdated,
}: {
  student: StudentDetail
  onUpdated: (student: StudentDetail) => void
}) {
  const id = useId()
  const mounted = useRef(false)
  const request = useRef<AbortController | null>(null)
  const [editing, setEditing] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [reason, setReason] = useState('')
  const [inputVersion, setInputVersion] = useState(0)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<HistoricalPhotoFieldErrors>({})
  const [requiresReload, setRequiresReload] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const correction = Boolean(student.historical_photo_url)
  const name = `${student.first_names} ${student.last_names}`.trim()

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      request.current?.abort()
    }
  }, [])

  function resetDraft() {
    setPhoto(null)
    setReason('')
    setInputVersion((current) => current + 1)
    setEditing(false)
    setConfirmation(null)
    setFieldErrors({})
    setError(null)
  }

  function prepareConfirmation(event: React.FormEvent) {
    event.preventDefault()
    if (request.current || requiresReload) return
    setError(null)
    setSuccess(null)
    const errors = validateHistoricalPhoto(
      photo,
      student.historical_photo_revision,
      correction,
      reason,
    )
    setFieldErrors(errors)
    if (Object.keys(errors).length || !photo) return
    // The confirmation holds the reviewed revision, even if the parent later refreshes.
    setConfirmation({
      photo,
      revision: student.historical_photo_revision,
      correction,
      reason: reason.trim(),
    })
  }

  async function save() {
    if (!confirmation || request.current || requiresReload) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    try {
      const updated = confirmation.correction
        ? await correctHistoricalPhoto(
            student.id,
            confirmation.photo,
            confirmation.revision,
            confirmation.reason,
            controller.signal,
          )
        : await uploadHistoricalPhoto(
            student.id,
            confirmation.photo,
            confirmation.revision,
            controller.signal,
          )
      if (!mounted.current || controller.signal.aborted) return
      onUpdated(updated)
      resetDraft()
      setSuccess('Fotografía institucional guardada correctamente.')
    } catch (cause) {
      if (!mounted.current || controller.signal.aborted) return
      setConfirmation(null)
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar la fotografía institucional.',
      )
      if (cause instanceof HistoricalPhotoApiError) {
        setFieldErrors(cause.fieldErrors)
        // Do not adopt current_revision or resend automatically after a conflict.
        setRequiresReload(
          cause.status === 409 || Boolean(cause.fieldErrors.revision),
        )
      }
    } finally {
      if (request.current === controller) request.current = null
      if (mounted.current && !controller.signal.aborted) setBusy(false)
    }
  }

  async function reloadDetail() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    try {
      const updated = await getAdminStudent(student.id, controller.signal)
      if (!mounted.current || controller.signal.aborted) return
      onUpdated(updated)
      resetDraft()
      setError(null)
      setSuccess(null)
      setRequiresReload(false)
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo recargar el detalle.',
        )
    } finally {
      if (request.current === controller) request.current = null
      if (mounted.current && !controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <section
      className={`${layoutStyles.sectionCard} ${styles.section}`}
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
    >
      <h2 id={`${id}-title`}>Fotografía institucional</h2>
      <p>
        Referencia histórica del estudiante para la verificación de identidad.
      </p>
      <div className={styles.content}>
        <div className={styles.photo}>
          <AuthenticatedImage
            url={student.historical_photo_url}
            revision={student.historical_photo_revision}
            alt={`Fotografía institucional de ${name}`}
            placeholder={
              <span role="img" aria-label="Sin fotografía histórica">
                Sin fotografía histórica
              </span>
            }
          />
        </div>
        <div className={styles.details}>
          <p>
            Revisión actual:{' '}
            <strong>{student.historical_photo_revision}</strong>
          </p>
          {success ? <p role="status">{success}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {fieldErrors.revision?.map((message) => (
            <p key={message} role="alert">
              {message}
            </p>
          ))}
          {requiresReload ? (
            <div role="alert">
              <p>
                Recarga el detalle del estudiante y revisa la fotografía y su
                revisión antes de volver a intentar.
              </p>
              <button
                type="button"
                className={layoutStyles.cancelBtn}
                disabled={busy}
                onClick={() => void reloadDetail()}
              >
                {busy ? 'Recargando…' : 'Recargar detalle'}
              </button>
            </div>
          ) : null}
          {!editing ? (
            <button
              type="button"
              className={layoutStyles.saveBtn}
              disabled={busy || requiresReload}
              onClick={() => {
                setEditing(true)
                setSuccess(null)
              }}
            >
              {correction
                ? 'Corregir fotografía institucional'
                : 'Cargar fotografía institucional'}
            </button>
          ) : (
            <form
              onSubmit={prepareConfirmation}
              className={styles.form}
              noValidate
            >
              <div>
                <label htmlFor={`${id}-photo`}>
                  Nueva fotografía institucional
                </label>
                <input
                  key={inputVersion}
                  id={`${id}-photo`}
                  type="file"
                  accept={HISTORICAL_PHOTO_ACCEPT}
                  disabled={busy || requiresReload}
                  aria-invalid={Boolean(fieldErrors.photo)}
                  aria-describedby={`${id}-photo-help ${id}-photo-error`}
                  onChange={(event) => {
                    setPhoto(event.target.files?.[0] ?? null)
                    setFieldErrors({})
                    setError(null)
                  }}
                />
                <p id={`${id}-photo-help`}>JPEG, PNG o WebP. Máximo 5 MB.</p>
                <div id={`${id}-photo-error`}>
                  {fieldErrors.photo?.map((message) => (
                    <p key={message} role="alert">
                      {message}
                    </p>
                  ))}
                </div>
              </div>
              {correction ? (
                <div>
                  <label htmlFor={`${id}-reason`}>
                    Motivo de la corrección (obligatorio)
                  </label>
                  <textarea
                    id={`${id}-reason`}
                    value={reason}
                    required
                    maxLength={500}
                    rows={3}
                    disabled={busy || requiresReload}
                    aria-invalid={Boolean(fieldErrors.reason)}
                    aria-describedby={`${id}-reason-error`}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <div id={`${id}-reason-error`}>
                    {fieldErrors.reason?.map((message) => (
                      <p key={message} role="alert">
                        {message}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className={styles.actions}>
                <button
                  type="submit"
                  className={layoutStyles.saveBtn}
                  disabled={busy || requiresReload}
                >
                  {correction ? 'Revisar corrección' : 'Revisar carga'}
                </button>
                <button
                  type="button"
                  className={layoutStyles.cancelBtn}
                  disabled={busy}
                  onClick={resetDraft}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmation !== null}
        title={
          confirmation?.correction
            ? 'Confirmar corrección de fotografía institucional'
            : 'Confirmar carga de fotografía institucional'
        }
        message={
          confirmation
            ? `${name}. Archivo: ${confirmation.photo.name}. Revisión: ${confirmation.revision}.${confirmation.correction ? ` Motivo: ${confirmation.reason}` : ''}`
            : ''
        }
        confirmLabel={
          confirmation?.correction ? 'Confirmar corrección' : 'Confirmar carga'
        }
        loading={busy}
        onConfirm={() => void save()}
        onCancel={() => {
          if (!request.current) setConfirmation(null)
        }}
      />
    </section>
  )
}
