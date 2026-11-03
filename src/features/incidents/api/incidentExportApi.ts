import { httpClient } from '@/shared/api/httpClient'
import { getRequestStatus } from '@/features/auth/utils/apiErrors'
import { IncidentApiError } from './incidentsApi'
import type { IncidentConsultationQuery } from '../types/incidentConsultation.types'
import {
  incidentConsultationParams,
  validateIncidentConsultation,
} from '../utils/incidentConsultationValidation'
import { isPositiveId } from '../utils/incidentValidation'

export type IncidentReportFormat = 'csv' | 'pdf'

// Reusable by HU33. The server exports the complete authorized filtered scope,
// not the records currently displayed by the paginated table.
export async function exportIncidentReport(
  examId: number,
  query: IncidentConsultationQuery,
  format: IncidentReportFormat,
  signal?: AbortSignal,
): Promise<Blob> {
  if (
    !isPositiveId(examId) ||
    !['csv', 'pdf'].includes(format) ||
    Object.keys(validateIncidentConsultation(query)).length
  )
    throw new IncidentApiError(
      'El examen, formato o filtros del reporte no son válidos.',
      422,
    )
  try {
    const response = await httpClient.get<Blob>(
      `/exams/${examId}/incidents/export`,
      {
        params: { ...incidentConsultationParams(query), format },
        responseType: 'blob',
        signal,
      },
    )
    const blob = response.data
    const expected = format === 'pdf' ? 'application/pdf' : 'text/csv'
    if (
      !(blob instanceof Blob) ||
      blob.size === 0 ||
      blob.type.split(';')[0].toLowerCase() !== expected ||
      (format === 'pdf' && (await blob.slice(0, 5).text()) !== '%PDF-')
    )
      throw new IncidentApiError(
        'El servidor no devolvió un reporte válido. No se descargó ningún archivo.',
      )
    return blob
  } catch (cause) {
    if (signal?.aborted || cause instanceof IncidentApiError) throw cause
    const status = getRequestStatus(cause)
    const messages: Record<number, string> = {
      401: 'Tu sesión expiró. Inicia sesión nuevamente.',
      403: 'No tienes permiso vigente para exportar estas incidencias.',
      404: 'No se encontró el reporte o la exportación aún no está disponible.',
      422: 'Los filtros del reporte no son válidos.',
      501: 'El servidor aún no tiene disponible la exportación de incidencias.',
    }
    throw new IncidentApiError(
      (status && messages[status]) ||
        'No se pudo generar el reporte. Inténtalo nuevamente.',
      status,
    )
  }
}
