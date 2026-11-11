import type { IncidentType, IncidentsPage } from './incident.types'

export type IncidentConsultationFilters = {
  search: string
  type: IncidentType | ''
  status: string
  date_from: string
  date_to: string
}

export type IncidentConsultationQuery = IncidentConsultationFilters & {
  page: number
}
export type IncidentConsultationErrors = Partial<
  Record<keyof IncidentConsultationQuery, string>
>

export type IncidentConsultationPage = IncidentsPage & {
  permissions: IncidentsPage['permissions'] & { can_export: boolean }
  // Counts describe all matching records, never just the current page.
  summary: { total: number; by_type: Record<IncidentType, number> }
  // States and labels are supplied by the server, not invented by the UI.
  filters: { statuses: { value: string; label: string }[] }
}

export const EMPTY_INCIDENT_FILTERS: IncidentConsultationFilters = {
  search: '',
  type: '',
  status: '',
  date_from: '',
  date_to: '',
}
