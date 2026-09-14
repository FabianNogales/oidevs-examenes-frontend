import { isAxiosError } from 'axios'
import type {
  ApiErrorResponse,
  StudentQrError,
} from '@/features/students/types/studentQr'

export function getStudentQrError(
  error: unknown,
  resource: 'exams' | 'qr',
): StudentQrError {
  const fallback =
    resource === 'exams'
      ? 'No se pudieron cargar los exámenes. Intenta nuevamente.'
      : 'No se pudo cargar el código QR. Intenta nuevamente.'

  if (!isAxiosError<ApiErrorResponse>(error)) return { message: fallback }

  const status = error.response?.status
  switch (status) {
    case 401:
      return {
        status,
        message:
          'Tu sesión no está disponible o ha caducado. Inicia sesión nuevamente.',
      }
    case 403: {
      const message = error.response?.data?.message
      return {
        status,
        message:
          typeof message === 'string' && message.trim()
            ? message
            : resource === 'qr'
              ? 'El código QR aún no está disponible. Se habilitará 24 horas antes del examen.'
              : 'No tienes permiso para consultar estos exámenes.',
      }
    }
    case 404:
      return {
        status,
        message:
          resource === 'qr'
            ? 'No se encontró el examen solicitado. Actualiza la lista de exámenes.'
            : 'El listado de exámenes no está disponible en este momento.',
      }
    default:
      return {
        status,
        message: !error.response
          ? 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.'
          : status !== undefined && status >= 500
            ? 'El servicio no está disponible en este momento. Intenta nuevamente más tarde.'
            : fallback,
      }
  }
}
