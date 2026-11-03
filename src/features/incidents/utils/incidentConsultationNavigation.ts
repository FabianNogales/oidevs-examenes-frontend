import type { IncidentType } from '../types/incident.types'
import type { IncidentConsultationQuery } from '../types/incidentConsultation.types'

export function readIncidentQuery(
  params: URLSearchParams,
): IncidentConsultationQuery {
  return {
    search: params.get('search') ?? '',
    type: (params.get('type') ?? '') as IncidentType | '',
    status: params.get('status') ?? '',
    date_from: params.get('date_from') ?? '',
    date_to: params.get('date_to') ?? '',
    page: params.has('page') ? Number(params.get('page')) : 1,
  }
}

// Preserve only consultation parameters; never accept a user-supplied return URL.
export function incidentConsultationSearch(params: URLSearchParams): string {
  const kept = new URLSearchParams()
  if (params.get('from') === 'teacher') kept.set('from', 'teacher')
  for (const field of [
    'search',
    'type',
    'status',
    'date_from',
    'date_to',
    'page',
  ]) {
    const value = params.get(field)
    if (value && !(field === 'page' && value === '1')) kept.set(field, value)
  }
  const text = kept.toString()
  return text ? '?' + text : ''
}
