import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthField } from '@/features/auth/components/AuthField'
import {
  ArrowRightIcon,
  InfoCircleIcon,
  UserIcon,
} from '@/features/auth/components/AuthIcons'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  getApiFieldErrors,
  getLoginErrorMessage,
} from '@/features/auth/utils/apiErrors'
import {
  AUTH_ROUTES,
  getHomeRouteForUser,
} from '@/features/auth/utils/authRoutes'
import type {
  LoginFieldErrors,
  LoginFormValues,
} from '@/features/auth/utils/authValidation'
import {
  validateIdentifier,
  validateLoginForm,
  validatePassword,
} from '@/features/auth/utils/authValidation'

type LoginFieldName = keyof LoginFormValues
type TouchedLoginFields = Partial<Record<LoginFieldName, boolean>>

const INITIAL_VALUES: LoginFormValues = {
  identifier: '',
  password: '',
}

const FIELD_VALIDATORS: Record<
  LoginFieldName,
  (value: string) => string | null
> = {
  identifier: validateIdentifier,
  password: validatePassword,
}

export function LoginForm() {
  const navigate = useNavigate()
  const { login, notify } = useAuth()
  const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [touchedFields, setTouchedFields] = useState<TouchedLoginFields>({})
  const [showPassword, setShowPassword] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: LoginFieldName, value: string) {
    const nextValues = { ...values, [field]: value }
    setValues(nextValues)

    if (touchedFields[field] || hasSubmitted) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: FIELD_VALIDATORS[field](value) ?? undefined,
      }))
    }
  }

  function markFieldAsTouched(field: LoginFieldName) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [field]: true,
    }))
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: FIELD_VALIDATORS[field](values[field]) ?? undefined,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setHasSubmitted(true)

    const validationErrors = validateLoginForm(values)

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const currentUser = await login({
        identifier: values.identifier.trim(),
        password: values.password,
      })
      setValues({ ...INITIAL_VALUES })

      const route = currentUser.must_change_password
        ? AUTH_ROUTES.changeInitialPassword
        : getHomeRouteForUser(currentUser)

      navigate(route, { replace: true })
    } catch (error) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        ...getApiFieldErrors(error),
      }))
      notify('error', getLoginErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <header className="auth-card__header">
        <h2 id="login-title">Iniciar sesión</h2>
        <p>Ingresa con tu correo institucional o código SIS</p>
      </header>

      <AuthField
        id="identifier"
        name="identifier"
        label="Correo institucional / Código SIS"
        type="text"
        autoComplete="username"
        value={values.identifier}
        error={fieldErrors.identifier}
        disabled={isSubmitting}
        onChange={(event) => updateField('identifier', event.target.value)}
        onBlur={() => markFieldAsTouched('identifier')}
        icon={<UserIcon />}
        placeholder="usuario@umss.edu.bo o código SIS"
        required
      />

      <div className="login-form__password-row">
        <PasswordInput
          id="password"
          name="password"
          label="Contraseña"
          autoComplete="current-password"
          value={values.password}
          error={fieldErrors.password}
          disabled={isSubmitting}
          isVisible={showPassword}
          onVisibilityChange={() => setShowPassword((isVisible) => !isVisible)}
          onChange={(value) => updateField('password', value)}
          onBlur={() => markFieldAsTouched('password')}
        />
        <Link className="auth-link" to={AUTH_ROUTES.forgotPassword}>
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        <span>{isSubmitting ? 'Ingresando...' : 'Ingresar'}</span>
        <ArrowRightIcon />
      </button>

      <div className="auth-card__divider" aria-hidden="true" />

      <p className="auth-note">
        <InfoCircleIcon />
        <span>
          Si es tu primer acceso, tu contraseña será tu carnet de identidad.
        </span>
      </p>
    </form>
  )
}
