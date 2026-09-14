import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { forgotPassword } from '@/features/auth/api/authApi'
import { AuthField } from '@/features/auth/components/AuthField'
import { UserIcon } from '@/features/auth/components/AuthIcons'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  getApiFieldErrors,
  getPasswordRecoveryErrorMessage,
} from '@/features/auth/utils/apiErrors'
import { AUTH_ROUTES } from '@/features/auth/utils/authRoutes'
import type { ForgotPasswordFieldErrors } from '@/features/auth/utils/authValidation'
import {
  validateEmail,
  validateForgotPasswordForm,
} from '@/features/auth/utils/authValidation'

export function ForgotPasswordForm() {
  const { notify } = useAuth()
  const [email, setEmail] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordFieldErrors>({})
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateEmail(value: string) {
    setEmail(value)

    if (hasInteracted) {
      setFieldErrors({
        email: validateEmail(value) ?? undefined,
      })
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setHasInteracted(true)

    const validationErrors = validateForgotPasswordForm({ email })

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await forgotPassword({ email: email.trim() })
      setEmail('')
      setFieldErrors({})
      notify(
        'success',
        'Te enviamos las instrucciones para restablecer tu contraseña.',
      )
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error))
      notify('error', getPasswordRecoveryErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <header className="auth-card__header">
        <h2>Recuperar contraseña</h2>
        <p>Ingresa tu correo institucional para recibir instrucciones.</p>
      </header>

      <AuthField
        id="recovery-email"
        name="email"
        label="Correo institucional"
        type="email"
        autoComplete="email"
        value={email}
        error={fieldErrors.email}
        disabled={isSubmitting}
        onChange={(event) => updateEmail(event.target.value)}
        onBlur={() => setHasInteracted(true)}
        icon={<UserIcon />}
        placeholder="usuario@umss.edu.bo"
        required
      />

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
      </button>

      <Link className="auth-card__back-link" to={AUTH_ROUTES.login}>
        Volver a iniciar sesión
      </Link>
    </form>
  )
}
