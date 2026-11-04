import { httpClient } from '@/shared/api/httpClient'
import { getRequestStatus } from '@/features/auth/utils/apiErrors'
import { isPositiveId } from '../utils/incidentValidation'
import { IncidentApiError } from './incidentsApi'
import type { IncidentsPage } from '../types/incident.types'

export type IncidentExamOption = {
  id: number
  name: string
  subject_name: string
  exam_date: string
}
export type IncidentExamCatalog = {
  data: IncidentExamOption[]
  meta: IncidentsPage['meta']
}

export async function getIncidentExamCatalog(
  search: string,
  page: number,
  signal?: AbortSignal,
): Promise<IncidentExamCatalog> {
  if (typeof search !== 'string' || !isPositiveId(page))
    throw new IncidentApiError('La búsqueda de exámenes no es válida.')
  try {
    const response = await httpClient.get<IncidentExamCatalog>(
      '/admin/incidents/exams',
      {
        params: { search: search.trim() || undefined, page, per_page: 10 },
        signal,
      },
    )
    const result = response.data
    const meta = result?.meta
    if (
      !Array.isArray(result?.data) ||
      !meta ||
      meta.current_page !== page ||
      !isPositiveId(meta.last_page) ||
      !isPositiveId(meta.per_page) ||
      meta.per_page > 100 ||
      !Number.isSafeInteger(meta.total) ||
      meta.total < 0 ||
      meta.last_page !== Math.max(1, Math.ceil(meta.total / meta.per_page)) ||
      page > meta.last_page ||
      result.data.length !==
        Math.min(
          meta.per_page,
          Math.max(0, meta.total - (page - 1) * meta.per_page),
        ) ||
      new Set(result.data.map((item) => item?.id)).size !==
        result.data.length ||
      result.data.some(
        (item) =>
          !item ||
          !isPositiveId(item.id) ||
          typeof item.name !== 'string' ||
          !item.name.trim() ||
          typeof item.subject_name !== 'string' ||
          !item.subject_name.trim() ||
          typeof item.exam_date !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(item.exam_date),
      )
    )
      throw new IncidentApiError(
        'El servidor devolvió un catálogo de exámenes incompleto.',
      )
    return result
  } catch (cause) {
    if (signal?.aborted || cause instanceof IncidentApiError) throw cause
    const status = getRequestStatus(cause)
    throw new IncidentApiError(
      status === 403
        ? 'No tienes autorización para consultar exámenes desde administración.'
        : 'No se pudo consultar el catálogo de exámenes. Inténtalo nuevamente.',
      status,
    )
  }
}
