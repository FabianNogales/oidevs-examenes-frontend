import axios from 'axios'
import type { InfractionFieldErrors } from '../types/infraction.types'

export class InfractionApiError extends Error {
  readonly status: number | null
  readonly fieldErrors: InfractionFieldErrors
  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: InfractionFieldErrors = {},
  ) {
    super(message)
    this.name = 'InfractionApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export function mapInfractionError(cause: unknown): never {
  if (cause instanceof InfractionApiError || axios.isCancel(cause)) throw cause
  const status = axios.isAxiosError(cause)
    ? (cause.response?.status ?? null)
    : null
  const fields: InfractionFieldErrors = {}
  if (axios.isAxiosError(cause) && status === 422) {
    for (const field of [
      'student_id',
      'type',
      'description',
      'observations',
      'status',
      'reason',
    ] as const) {
      const messages = cause.response?.data?.errors?.[field]
      if (Array.isArray(messages) && typeof messages[0] === 'string')
        fields[field] = messages[0]
    }
  }
  const messages: Record<number, string> = {
    401: 'Tu sesión expiró. Inicia sesión nuevamente.',
    403: 'No tienes autorización para gestionar infracciones de este examen.',
    404: 'No se encontró la infracción o la función aún no está disponible.',
    409: 'La información cambió. Actualiza el detalle antes de continuar.',
    422: 'Revisa los campos de la infracción.',
    501: 'El servidor aún no tiene disponible la gestión de infracciones.',
  }
  throw new InfractionApiError(
    (status && messages[status]) ||
      'No se pudo confirmar la operación. Consulta el registro antes de volver a intentarlo.',
    status,
    fields,
  )
}
