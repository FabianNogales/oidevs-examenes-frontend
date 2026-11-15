import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, Info, Mail } from 'lucide-react'
import { AuthField } from '@/features/auth/components/AuthField'
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
import { Button, Heading, Text } from '@/shared/components/ui'

type LoginFieldName = keyof LoginFormValues
type TouchedLoginFields = Partial<Record<LoginFieldName, boolean>>

type LoginFormProps = {
  onPasswordVisibilityChange?: (isVisible: boolean) => void
}

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

export function LoginForm({ onPasswordVisibilityChange }: LoginFormProps) {
  const navigate = useNavigate()
  const { login, notify } = useAuth()
  const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [touchedFields, setTouchedFields] = useState<TouchedLoginFields>({})
  const [showPassword, setShowPassword] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function togglePasswordVisibility() {
    setShowPassword((current) => {
      const next = !current
      onPasswordVisibilityChange?.(next)
      return next
    })
  }

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
      if (validationErrors.identifier && values.identifier.trim().includes('@')) {
        notify('error', validationErrors.identifier)
      }
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
        <Heading level={3} id="login-title">
          Iniciar sesión
        </Heading>
        <Text variant="small" tone="secondary">
          Ingresa con tu correo, código institucional
        </Text>
      </header>

      <AuthField
        id="identifier"
        name="identifier"
        label="Correo institucional"
        type="text"
        autoComplete="username"
        value={values.identifier}
        error={fieldErrors.identifier}
        disabled={isSubmitting}
        onChange={(event) => updateField('identifier', event.target.value)}
        onBlur={() => markFieldAsTouched('identifier')}
        icon={<Mail aria-hidden="true" />}
        placeholder="Correo institucional o Código institucional"
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
          onVisibilityChange={togglePasswordVisibility}
          onChange={(value) => updateField('password', value)}
          onBlur={() => markFieldAsTouched('password')}
        />
        <Link className="auth-link" to={AUTH_ROUTES.forgotPassword}>
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button
        className="primary-button"
        type="submit"
        variant="primary"
        loading={isSubmitting}
      >
        <span>{isSubmitting ? 'Ingresando...' : 'Ingresar'}</span>
        <ArrowRight aria-hidden="true" />
      </Button>

      <div className="auth-card__divider" aria-hidden="true" />

      <div className="auth-note">
        <Info aria-hidden="true" />
        <Text as="span" variant="small" tone="primary">
          Si es tu primer acceso, tu contraseña será tu carnet de identidad.
        </Text>
      </div>
    </form>
  )
}
