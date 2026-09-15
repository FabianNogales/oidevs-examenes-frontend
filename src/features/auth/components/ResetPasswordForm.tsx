import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { resetPassword } from '@/features/auth/api/authApi'
import { AuthField } from '@/features/auth/components/AuthField'
import { UserIcon } from '@/features/auth/components/AuthIcons'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  getApiFieldErrors,
  getPasswordRecoveryErrorMessage,
} from '@/features/auth/utils/apiErrors'
import { AUTH_ROUTES } from '@/features/auth/utils/authRoutes'
import type {
  ResetPasswordFieldErrors,
  ResetPasswordFormValues,
} from '@/features/auth/utils/authValidation'
import { validateResetPasswordForm } from '@/features/auth/utils/authValidation'

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams()
  const { token } = useParams()
  const navigate = useNavigate()
  const { notify } = useAuth()
  const [values, setValues] = useState<ResetPasswordFormValues>({
    email: searchParams.get('email') ?? '',
    token: token ?? searchParams.get('token') ?? '',
    password: '',
    password_confirmation: '',
  })
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({})
  const [showPasswords, setShowPasswords] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof ResetPasswordFormValues, value: string) {
    const nextValues = { ...values, [field]: value }
    setValues(nextValues)

    if (hasSubmitted) {
      setFieldErrors(validateResetPasswordForm(nextValues))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setHasSubmitted(true)

    const validationErrors = validateResetPasswordForm(values)

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword({
        email: values.email.trim(),
        token: values.token,
        password: values.password,
        password_confirmation: values.password_confirmation,
      })
      notify('success', 'Tu contraseña fue restablecida correctamente.')
      navigate(AUTH_ROUTES.login, { replace: true })
    } catch (error) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        ...getApiFieldErrors(error),
      }))
      notify('error', getPasswordRecoveryErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <header className="auth-card__header">
        <h2>Restablecer contraseña</h2>
        <p>Define una nueva contraseña para tu cuenta institucional.</p>
      </header>

      <AuthField
        id="reset-email"
        name="email"
        label="Correo institucional"
        type="email"
        autoComplete="email"
        value={values.email}
        error={fieldErrors.email}
        disabled={isSubmitting}
        onChange={(event) => updateField('email', event.target.value)}
        icon={<UserIcon />}
        placeholder="usuario@umss.edu.bo"
        required
      />

      <PasswordInput
        id="reset-password"
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
        id="reset-password-confirmation"
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

      {fieldErrors.token ? (
        <p className="auth-field__error" role="alert">
          {fieldErrors.token}
        </p>
      ) : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Restableciendo...' : 'Restablecer contraseña'}
      </button>

      <Link className="auth-card__back-link" to={AUTH_ROUTES.login}>
        Volver a iniciar sesión
      </Link>
    </form>
  )
}
