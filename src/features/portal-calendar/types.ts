export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED'
export type EventVisibility = 'PUBLIC' | 'PRIVATE'

export const VISIBILITY_LABELS: Record<EventVisibility, string> = {
  PUBLIC: 'Público',
  PRIVATE: 'Privado',
}

export const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  CANCELLED: 'Cancelado',
}

export type EventCategory = { id: number; name: string }

export type PortalEvent = {
  id: number
  title: string
  description: string
  starts_at: string
  ends_at: string
  all_day: boolean
  location: string | null
  category: EventCategory
  status: EventStatus
  published_at: string | null
}

export type AdminPortalEvent = PortalEvent & {
  visibility: EventVisibility
  revision: number
  created_by: number
  updated_by: number
}

export type EventInput = {
  visibility: EventVisibility
  title: string
  description: string
  starts_at: string
  ends_at: string
  all_day: boolean
  location: string | null
  category_id: number
}

export type EventQuery = {
  search?: string
  category_id?: number
  from?: string
  to?: string
  page?: number
  per_page?: number
}

export type EventPage<T> = {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
