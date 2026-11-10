import { useState, useEffect, type FormEvent } from 'react'
import { CheckCircle2, Save, X, XCircle } from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  Dropdown,
  FormField,
  Heading,
  Icon,
  Input,
  Text,
} from '@/shared/components/ui/index'
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
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(entity.status)
  const [institutionalCode, setInstitutionalCode] = useState(
    entity.institutional_code ?? '',
  )

  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    setFirstNames(entity.first_names)
    setLastNames(entity.last_names)
    setEmail(entity.email)
    setStatus(entity.status)
    setInstitutionalCode(entity.institutional_code ?? '')
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

    if (
      entity.role === 'TEACHER' &&
      (!institutionalCode.trim() ||
        institutionalCode.trim().length > 50 ||
        trimmedFirst.length > 100 ||
        trimmedLast.length > 100 ||
        !trimmedEmail ||
        trimmedEmail.length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
    ) {
      setFeedback({
        type: 'error',
        text: 'Revisa los campos obligatorios, sus longitudes y el formato del correo.',
      })
      return
    }

    try {
      setSaving(true)
      setFeedback(null)
      await onUpdateEntity({
        first_names: trimmedFirst,
        last_names: trimmedLast,
        email: trimmedEmail,
        status: status,
        ...(entity.role === 'TEACHER'
          ? { institutional_code: institutionalCode.trim() }
          : {}),
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
    <Card as="section" className={layoutStyles.sectionCard}>
      <Heading level={2}>Editar datos del perfil</Heading>
      <Text variant="small" tone="secondary">
        Modifica los nombres, correo y el estado de habilitación de la cuenta.
      </Text>

      <form className={layoutStyles.editForm} onSubmit={handleSubmit}>
        {feedback && (
          <Alert
            role="alert"
            tone={feedback.type === 'success' ? 'success' : 'danger'}
            className={`${layoutStyles.feedbackMsg} ${
              feedback.type === 'success'
                ? layoutStyles.feedbackSuccess
                : layoutStyles.feedbackError
            }`}
          >
            {feedback.text}
          </Alert>
        )}

        <FormField
          label="Nombre(s)"
          htmlFor="edit-first-names"
          required
          className={layoutStyles.formGroup}
        >
          <Input
            id="edit-first-names"
            type="text"
            className={layoutStyles.formInput}
            value={firstNames}
            onChange={(e) => setFirstNames(e.target.value)}
            disabled={saving}
            required
          />
        </FormField>

        <FormField
          label="Apellidos"
          htmlFor="edit-last-names"
          required
          className={layoutStyles.formGroup}
        >
          <Input
            id="edit-last-names"
            type="text"
            className={layoutStyles.formInput}
            value={lastNames}
            onChange={(e) => setLastNames(e.target.value)}
            disabled={saving}
            required
          />
        </FormField>

        <FormField
          label="Correo electrónico"
          htmlFor="edit-email"
          required
          className={layoutStyles.formGroup}
        >
          <Input
            id="edit-email"
            type="email"
            className={layoutStyles.formInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
            required
          />
        </FormField>

        {entity.role === 'STUDENT' && (
          <FormField
            label="Carrera"
            htmlFor="edit-career"
            className={layoutStyles.formGroup}
          >
            <Input
              id="edit-career"
              type="text"
              className={layoutStyles.formInput}
              value={entity.career_name || 'No registrada'}
              disabled
            />
          </FormField>
        )}

        <FormField
          label="Código institucional (SIS)"
          htmlFor="edit-sis"
          required={entity.role === 'TEACHER'}
          className={layoutStyles.formGroup}
        >
          <Input
            id="edit-sis"
            type="text"
            className={layoutStyles.formInput}
            value={institutionalCode}
            onChange={(event) => setInstitutionalCode(event.target.value)}
            maxLength={50}
            required={entity.role === 'TEACHER'}
            disabled={entity.role !== 'TEACHER' || saving}
          />
        </FormField>

        {/* CAMPO DE ESTADO - UNIVERSAL DROPDOWN */}
        <div className={layoutStyles.formGroup}>
          <label id="edit-status-label" htmlFor="edit-status">
            Estado de la cuenta
          </label>
          <Dropdown<'ACTIVE' | 'INACTIVE'>
            id="edit-status"
            aria-labelledby="edit-status-label"
            disabled={saving}
            value={status}
            tone={status === 'ACTIVE' ? 'success' : 'danger'}
            options={[
              {
                value: 'ACTIVE',
                label: 'Activo (Habilitado)',
                tone: 'success',
                icon: CheckCircle2,
              },
              {
                value: 'INACTIVE',
                label: 'Inactivo (Inhabilitado)',
                tone: 'danger',
                icon: XCircle,
              },
            ]}
            onChange={(nextStatus) => setStatus(nextStatus)}
          />
        </div>

        <div className={layoutStyles.formActions}>
          <Button
            type="button"
            variant="secondary"
            className={layoutStyles.cancelBtn}
            onClick={() => onNavigateTab('perfil')}
            disabled={saving}
          >
            <Icon icon={X} size="sm" />
            <span>Cancelar</span>
          </Button>
          <Button
            type="submit"
            variant="primary"
            className={layoutStyles.saveBtn}
            loading={saving}
          >
            <Icon icon={Save} size="sm" />
            <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
          </Button>
        </div>
      </form>
    </Card>
  )
}
