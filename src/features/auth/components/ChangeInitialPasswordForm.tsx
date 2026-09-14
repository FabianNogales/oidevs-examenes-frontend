import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { updatePassword } from '@/features/auth/api/authApi'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  getApiFieldErrors,
  getPasswordChangeErrorMessage,
} from '@/features/auth/utils/apiErrors'
import { getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import type {
  ChangePasswordFieldErrors,
  ChangePasswordFormValues,
} from '@/features/auth/utils/authValidation'
import { validateChangePasswordForm } from '@/features/auth/utils/authValidation'

const INITIAL_VALUES: ChangePasswordFormValues = {
  current_password: '',
  password: '',
  password_confirmation: '',
}

export function ChangeInitialPasswordForm() {
  const navigate = useNavigate()
  const { notify, refreshUser } = useAuth()
  const [values, setValues] =
    useState<ChangePasswordFormValues>(INITIAL_VALUES)
  const [fieldErrors, setFieldErrors] = useState<ChangePasswordFieldErrors>({})
  const [showPasswords, setShowPasswords] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof ChangePasswordFormValues, value: string) {
    const nextValues = { ...values, [field]: value }
    setValues(nextValues)

    if (hasSubmitted) {
      setFieldErrors(validateChangePasswordForm(nextValues))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setHasSubmitted(true)

    const validationErrors = validateChangePasswordForm(values)

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await updatePassword(values)
      const currentUser = await refreshUser()

      if (currentUser && !currentUser.must_change_password) {
        notify('success', 'Tu contraseña fue actualizada correctamente.')
        navigate(getHomeRouteForUser(currentUser), { replace: true })
        return
      }

      notify('info', 'Actualizamos tu contraseña. Ingresa nuevamente.')
    } catch (error) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        ...getApiFieldErrors(error),
      }))
      notify('error', getPasswordChangeErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <header className="auth-card__header">
        <h2>Cambia tu contraseña</h2>
        <p>Antes de continuar, reemplaza tu contraseña inicial.</p>
      </header>

      <PasswordInput
        id="current-password"
        name="current_password"
        label="Contraseña actual"
        autoComplete="current-password"
        value={values.current_password}
        error={fieldErrors.current_password}
        disabled={isSubmitting}
        isVisible={showPasswords}
        onVisibilityChange={() => setShowPasswords((isVisible) => !isVisible)}
        onChange={(value) => updateField('current_password', value)}
      />

      <PasswordInput
        id="new-password"
        name="password"
        label="Nueva contraseña"
        autoComplete="new-password"
        value={values.password}
        error={fieldErrors.password}
        disabled={isSubmitting}
        isVisible={showPasswords}
        onVisibilityChange={() => setShowPasswords((isVisible) => !isVisible)}
        onChange={(value) => updateField('password', value)}
      />

      <PasswordInput
        id="new-password-confirmation"
        name="password_confirmation"
        label="Confirmación de nueva contraseña"
        autoComplete="new-password"
        value={values.password_confirmation}
        error={fieldErrors.password_confirmation}
        disabled={isSubmitting}
        isVisible={showPasswords}
        onVisibilityChange={() => setShowPasswords((isVisible) => !isVisible)}
        onChange={(value) => updateField('password_confirmation', value)}
      />

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
      </button>
    </form>
  )
}
