import axios from 'axios'

export function getTeacherDashboardErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.'
    }

    const status = error.response.status
    if (status >= 500 && status < 600) {
      return 'Ocurrió un error en el servidor. Inténtalo nuevamente.'
    }
    if (status === 403) {
      return 'No tienes permisos para consultar esta información.'
    }
  }

  // El interceptor existente sigue siendo responsable de las respuestas 401.
  return 'No fue posible cargar la información. Inténtalo nuevamente.'
}
