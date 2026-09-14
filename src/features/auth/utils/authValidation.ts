import { env } from '@/app/config/env'

export const AUTH_FIELD_LIMITS = Object.freeze({
  identifierMax: 100,
  sisMin: 9,
  passwordMin: 8,
  passwordMax: 20,
})

export type LoginFormValues = {
  identifier: string
  password: string
}

export type ChangePasswordFormValues = {
  current_password: string
  password: string
  password_confirmation: string
}

export type ForgotPasswordFormValues = {
  email: string
}

export type ResetPasswordFormValues = {
  email: string
  token: string
  password: string
  password_confirmation: string
}

export type LoginFieldErrors = Partial<Record<keyof LoginFormValues, string>>
export type ChangePasswordFieldErrors = Partial<
  Record<keyof ChangePasswordFormValues, string>
>
export type ForgotPasswordFieldErrors = Partial<
  Record<keyof ForgotPasswordFormValues, string>
>
export type ResetPasswordFieldErrors = Partial<
  Record<keyof ResetPasswordFormValues, string>
>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NUMERIC_PATTERN = /^\d+$/

function isInstitutionalEmail(email: string): boolean {
  const domain = email.split('@').at(-1)?.toLowerCase()

  return Boolean(domain && env.institutionalEmailDomains.includes(domain))
}

export function validateIdentifier(identifier: string): string | null {
  const value = identifier.trim()

  if (!value) {
    return 'Este campo es obligatorio.'
  }

  if (value.length > AUTH_FIELD_LIMITS.identifierMax) {
    return 'El identificador no debe superar los 100 caracteres.'
  }

  if (value.includes('@')) {
    if (!EMAIL_PATTERN.test(value) || !isInstitutionalEmail(value)) {
      return 'Ingresa un correo institucional válido.'
    }

    return null
  }

  if (!NUMERIC_PATTERN.test(value)) {
    return 'El Código SIS debe contener solo números.'
  }

  if (value.length < AUTH_FIELD_LIMITS.sisMin) {
    return 'El Código SIS debe contener al menos 9 dígitos.'
  }

  return null
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Este campo es obligatorio.'
  }

  if (password.length < AUTH_FIELD_LIMITS.passwordMin) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }

  if (password.length > AUTH_FIELD_LIMITS.passwordMax) {
    return 'La contraseña no debe superar los 20 caracteres.'
  }

  return null
}

export function validateEmail(email: string): string | null {
  const value = email.trim()

  if (!value) {
    return 'Este campo es obligatorio.'
  }

  if (!EMAIL_PATTERN.test(value) || !isInstitutionalEmail(value)) {
    return 'Ingresa un correo institucional válido.'
  }

  return null
}

export function validateLoginForm(
  values: LoginFormValues,
): LoginFieldErrors {
  return removeEmptyErrors({
    identifier: validateIdentifier(values.identifier),
    password: validatePassword(values.password),
  })
}

export function validateChangePasswordForm(
  values: ChangePasswordFormValues,
): ChangePasswordFieldErrors {
  return removeEmptyErrors({
    current_password: validatePassword(values.current_password),
    password: validatePassword(values.password),
    password_confirmation: validatePasswordConfirmation(
      values.password,
      values.password_confirmation,
    ),
  })
}

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
): ForgotPasswordFieldErrors {
  return removeEmptyErrors({
    email: validateEmail(values.email),
  })
}

export function validateResetPasswordForm(
  values: ResetPasswordFormValues,
): ResetPasswordFieldErrors {
  return removeEmptyErrors({
    email: validateEmail(values.email),
    token: values.token ? null : 'El enlace de recuperación no es válido.',
    password: validatePassword(values.password),
    password_confirmation: validatePasswordConfirmation(
      values.password,
      values.password_confirmation,
    ),
  })
}

function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) {
    return 'Este campo es obligatorio.'
  }

  if (password !== confirmation) {
    return 'La confirmación no coincide con la nueva contraseña.'
  }

  return null
}

function removeEmptyErrors<T extends Record<string, string | null>>(
  errors: T,
): Partial<Record<keyof T, string>> {
  return Object.entries(errors).reduce<Partial<Record<keyof T, string>>>(
    (result, [key, value]) => {
      if (value) {
        result[key as keyof T] = value
      }

      return result
    },
    {},
  )
}
