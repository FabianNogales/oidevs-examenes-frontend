import { isAxiosError } from 'axios'
import type { StudentProfileError } from '@/features/students/types/studentProfile'

function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) {
      const message = firstMessage(entry)
      if (message) return message
    }
  }
}

export function getStudentProfileError(
  error: unknown,
  resource: 'profile' | 'photo',
): StudentProfileError {
  const fallback =
    resource === 'photo'
      ? 'No fue posible actualizar la foto de perfil.'
      : 'No fue posible cargar los datos del perfil.'

  if (
    !isAxiosError<{
      message?: unknown
      errors?: Record<string, unknown>
    }>(error)
  )
    return { message: fallback }

  const status = error.response?.status
  switch (status) {
    case 401:
      return {
        status,
        message:
          'Tu sesión no está disponible o ha caducado. Inicia sesión nuevamente.',
      }
    case 404:
      return { status, message: 'No se encontraron datos del perfil.' }
    case 422: {
      const body = error.response?.data
      return {
        status,
        message:
          firstMessage(body?.errors?.photo) ||
          firstMessage(body?.errors) ||
          firstMessage(body?.message) ||
          fallback,
      }
    }
    default:
      return { status, message: fallback }
  }
}
