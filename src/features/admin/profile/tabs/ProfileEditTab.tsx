import { Link } from 'react-router'
import { useState, useEffect, type FormEvent } from 'react'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function ProfileEditTab({
  entity,
  onUpdateEntity,
  onNavigateTab,
}: ProfileTabComponentProps) {
  const [firstNames, setFirstNames] = useState(entity.first_names)
  const [lastNames, setLastNames] = useState(entity.last_names)
  const [email, setEmail] = useState(entity.email)
  const [institutionalCode, setInstitutionalCode] = useState(entity.institutional_code)
  const [identityNumber, setIdentityNumber] = useState(entity.identity_number ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    setFirstNames(entity.first_names)
    setLastNames(entity.last_names)
    setEmail(entity.email)
    setInstitutionalCode(entity.institutional_code)
    setIdentityNumber(entity.identity_number ?? '')
  }, [entity])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!onUpdateEntity || saving) return

    const trimmedFirst = firstNames.trim()
    const trimmedLast = lastNames.trim()
    const trimmedEmail = email.trim()

    if (!trimmedFirst || !trimmedLast) {
      setFeedback({
        type: 'error',
        text: 'Los nombres y apellidos son obligatorios y no pueden quedar vacíos.',
      })
      return
    }

    if (entity.role === 'TEACHER' && (
      !institutionalCode.trim() || institutionalCode.trim().length > 50 ||
      !identityNumber.trim() || identityNumber.trim().length > 50 ||
      trimmedFirst.length > 100 || trimmedLast.length > 100 ||
      !trimmedEmail || trimmedEmail.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    )) {
      setFeedback({ type: 'error', text: 'Revisa los campos obligatorios, sus longitudes y el formato del correo.' })
      return
    }

    try {
      setSaving(true)
      setFeedback(null)
      await onUpdateEntity({
        first_names: trimmedFirst,
        last_names: trimmedLast,
        email: trimmedEmail,
        ...(entity.role === 'TEACHER' ? {
          institutional_code: institutionalCode.trim(),
          identity_number: identityNumber.trim(),
        } : {}),
      })
      setFeedback({
        type: 'success',
        text: 'Datos actualizados correctamente.',
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'No se pudieron guardar los cambios.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Editar datos del perfil</h2>
      <p>Modifica los nombres y los campos habilitados para administración.</p>

      <form className={layoutStyles.editForm} onSubmit={handleSubmit}>
        {feedback && (
          <p
            role="alert"
            className={`${layoutStyles.feedbackMsg} ${
              feedback.type === 'success'
                ? layoutStyles.feedbackSuccess
                : layoutStyles.feedbackError
            }`}
          >
            {feedback.text}
          </p>
        )}

        <div className={layoutStyles.formGroup}>
          <label htmlFor="edit-first-names">Nombre(s)</label>
          <input
            id="edit-first-names"
            type="text"
            className={layoutStyles.formInput}
            value={firstNames}
            onChange={(e) => setFirstNames(e.target.value)}
            disabled={saving}
            required
          />
        </div>

        <div className={layoutStyles.formGroup}>
          <label htmlFor="edit-last-names">Apellidos</label>
          <input
            id="edit-last-names"
            type="text"
            className={layoutStyles.formInput}
            value={lastNames}
            onChange={(e) => setLastNames(e.target.value)}
            disabled={saving}
            required
          />
        </div>

        <div className={layoutStyles.formGroup}>
          <label htmlFor="edit-email">Correo electrónico</label>
          <input
            id="edit-email"
            type="email"
            className={layoutStyles.formInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
            required
          />
        </div>

        {entity.role === 'STUDENT' && (
          <div className={layoutStyles.formGroup}>
            <label htmlFor="edit-career">Carrera</label>
            <input
              id="edit-career"
              type="text"
              className={layoutStyles.formInput}
              value={entity.career_name || 'No registrada'}
              disabled
            />
          </div>
        )}

        <div className={layoutStyles.formGroup}>
          <label htmlFor="edit-sis">Código institucional (SIS)</label>
          <input
            id="edit-sis"
            type="text"
            className={layoutStyles.formInput}
            value={institutionalCode}
            onChange={(event) => setInstitutionalCode(event.target.value)}
            maxLength={50}
            required={entity.role === 'TEACHER'}
            disabled={entity.role !== 'TEACHER' || saving}
          />
        </div>

        {entity.role === 'TEACHER' && (
          <>
            <div className={layoutStyles.formGroup}>
              <label htmlFor="edit-identity-number">Carnet de identidad</label>
              <input
                id="edit-identity-number"
                type="text"
                className={layoutStyles.formInput}
                value={identityNumber}
                onChange={(event) => setIdentityNumber(event.target.value)}
                maxLength={50}
                required
                disabled={saving}
              />
            </div>
            <p>
              Las materias se administran por periodo desde{' '}
              <Link to={`/admin/teachers/assignments?teacher_id=${entity.id}`}>
                Gestionar asignaciones
              </Link>. Guarda primero los cambios de los datos personales.
            </p>
          </>
        )}

        <div className={layoutStyles.formActions}>
          <button
            type="button"
            className={layoutStyles.cancelBtn}
            onClick={() => onNavigateTab('perfil')}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={layoutStyles.saveBtn}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  )
}