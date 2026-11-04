import axios from 'axios'
export class ExamReportError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'ExamReportError'
    this.status = status
  }
}
export function invalidReport(): never {
  throw new ExamReportError(
    'El servidor devolvió un reporte incompleto o ajeno al alcance solicitado. Genera una consulta nueva.',
  )
}
export function mapReportError(e: unknown): never {
  if (e instanceof ExamReportError || axios.isCancel(e)) throw e
  const status = axios.isAxiosError(e) ? (e.response?.status ?? null) : null
  const messages: Record<number, string> = {
    401: 'Tu sesión expiró. Inicia sesión nuevamente.',
    403: 'No tienes permiso para consultar o exportar este reporte.',
    404: 'El reporte o su catálogo aún no está disponible.',
    410: 'El reporte venció. Genera uno nuevo antes de consultar o descargar.',
    422: 'Revisa el examen y los filtros del reporte.',
    501: 'Los reportes de exámenes aún no están disponibles en el servidor.',
  }
  throw new ExamReportError(
    (status && messages[status]) ||
      'No se pudo generar el reporte. Comprueba la conexión e inténtalo nuevamente.',
    status,
  )
}
