import type { IncidentType } from '../types/incident.types'
import type { IncidentConsultationQuery } from '../types/incidentConsultation.types'
import { isPositiveId } from './incidentValidation'

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
  if (params.get('from') === 'admin') {
    kept.set('from', 'admin')
    if (isPositiveId(Number(params.get('exam_id'))))
      kept.set('exam_id', String(Number(params.get('exam_id'))))
  }
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

export function incidentConsultationListPath(
  examId: number,
  params: URLSearchParams,
): string {
  if (params.get('from') === 'admin') {
    const scoped = new URLSearchParams(params)
    scoped.set('exam_id', String(examId))
    return '/admin/incidents' + incidentConsultationSearch(scoped)
  }
  return `/exams/${examId}/incidents${incidentConsultationSearch(params)}`
}
