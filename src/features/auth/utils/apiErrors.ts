import axios from 'axios'

type ApiErrorBody = {
  message?: unknown
  code?: unknown
  errors?: unknown
}

export function getApiErrorCode(error: unknown): string | null {
  const body = getApiErrorBody(error)

  return typeof body?.code === 'string' ? body.code : null
}

export function getApiErrorMessage(error: unknown): string | null {
  const body = getApiErrorBody(error)

  return typeof body?.message === 'string' ? body.message : null
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  const errors = getApiErrorBody(error)?.errors

  if (!isRecord(errors)) {
    return {}
  }

  return Object.entries(errors).reduce<Record<string, string>>(
    (result, [field, messages]) => {
      if (
        Array.isArray(messages) &&
        messages.length > 0 &&
        typeof messages[0] === 'string'
      ) {
        result[field] = messages[0]
      }

      return result
    },
    {},
  )
}

export function getRequestStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) {
    return null
  }

  return error.response?.status ?? null
}

export function getLoginErrorMessage(error: unknown): string {
  const fieldErrors = getApiFieldErrors(error)

  if (fieldErrors.identifier?.toLowerCase().includes('inactiva')) {
    return 'La cuenta se encuentra inactiva.'
  }

  const status = getRequestStatus(error)

  if (status === 422) {
    return 'El correo/Código SIS o la contraseña no son correctos.'
  }

  if (status === 419) {
    return 'La sesión expiró. Inténtalo nuevamente.'
  }

  if (status && status >= 500) {
    return 'El servidor no pudo procesar la solicitud. Inténtalo más tarde.'
  }

  return 'No se pudo completar la operación. Verifica tu conexión.'
}

export function getPasswordChangeErrorMessage(error: unknown): string {
  const status = getRequestStatus(error)

  if (status === 422) {
    return 'Revisa los datos ingresados para cambiar tu contraseña.'
  }

  if (getApiErrorCode(error) === 'SESSION_REPLACED') {
    return 'Tu sesión fue cerrada porque se inició sesión en otro dispositivo.'
  }

  return 'No se pudo cambiar la contraseña. Inténtalo nuevamente.'
}

export function getPasswordRecoveryErrorMessage(error: unknown): string {
  const status = getRequestStatus(error)

  if (status === 422) {
    return 'Revisa los datos ingresados para recuperar tu contraseña.'
  }

  return 'No se pudo completar la recuperación. Inténtalo nuevamente.'
}

function getApiErrorBody(error: unknown): ApiErrorBody | null {
  if (!axios.isAxiosError(error) || !isRecord(error.response?.data)) {
    return null
  }

  return error.response.data
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
