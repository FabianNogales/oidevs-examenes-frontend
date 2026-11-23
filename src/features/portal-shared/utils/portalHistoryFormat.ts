import type {
  HistoryValue,
  PortalHistoryResource,
} from '../api/portalHistoryApi'

const PORTAL_ACTION_LABELS: Readonly<Record<string, string>> = {
  PORTAL_EVENT_CREATED: 'Evento creado',
  PORTAL_EVENT_UPDATED: 'Evento actualizado',
  PORTAL_EVENT_PUBLISHED: 'Evento publicado',
  PORTAL_EVENT_UNPUBLISHED: 'Evento despublicado',
  PORTAL_EVENT_CANCELLED: 'Evento cancelado',
  PORTAL_EVENT_DELETED: 'Evento eliminado',
  PORTAL_EVENT_STATUS_CHANGED: 'Estado del evento actualizado',
  PORTAL_EVENT_VISIBILITY_CHANGED: 'Visibilidad del evento actualizada',
  EVENT_CREATED: 'Evento creado',
  EVENT_UPDATED: 'Evento actualizado',
  EVENT_PUBLISHED: 'Evento publicado',
  EVENT_UNPUBLISHED: 'Evento despublicado',
  EVENT_CANCELLED: 'Evento cancelado',
  EVENT_DELETED: 'Evento eliminado',
  EVENT_STATUS_CHANGED: 'Estado del evento actualizado',
  PORTAL_NEWS_CREATED: 'Noticia creada',
  PORTAL_NEWS_UPDATED: 'Noticia actualizada',
  PORTAL_NEWS_IMAGE_UPDATED: 'Imagen de la noticia actualizada',
  PORTAL_NEWS_IMAGE_REMOVED: 'Imagen de la noticia eliminada',
  PORTAL_NEWS_PUBLISHED: 'Noticia publicada',
  PORTAL_NEWS_UNPUBLISHED: 'Noticia despublicada',
  PORTAL_NEWS_DELETED: 'Noticia eliminada',
  PORTAL_NEWS_STATUS_CHANGED: 'Estado de la noticia actualizado',
  NEWS_CREATED: 'Noticia creada',
  NEWS_UPDATED: 'Noticia actualizada',
  NEWS_PUBLISHED: 'Noticia publicada',
  NEWS_UNPUBLISHED: 'Noticia despublicada',
  NEWS_DELETED: 'Noticia eliminada',
}

const STATUS_LABELS: Readonly<Record<string, string>> = {
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivado',
  PUBLISHED: 'Publicado',
  UNPUBLISHED: 'Despublicado',
  CANCELLED: 'Cancelado',
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
}

const VISIBILITY_LABELS: Readonly<Record<string, string>> = {
  PUBLIC: 'Público',
  PRIVATE: 'Privado',
  AUTHENTICATED: 'Solo usuarios autenticados',
}

const DESTINATION_TYPE_LABELS: Readonly<Record<string, string>> = {
  INTERNAL: 'Interno',
  EXTERNAL: 'Externo',
}

const BOOLEAN_FIELDS = new Set([
  'all_day',
  'is_published',
  'has_image',
  'requires_auth',
  'needs_review',
])

const DATE_FIELDS = new Set([
  'starts_at',
  'ends_at',
  'published_at',
  'created_at',
  'updated_at',
])

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

export function formatAuditDate(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(parsed))
}

export function formatAuditAction(
  action: string,
  resource?: PortalHistoryResource,
): string {
  const normalized = action.trim().toUpperCase()
  const exact = PORTAL_ACTION_LABELS[normalized]
  if (exact) return exact

  if (resource === 'events') {
    if (normalized.includes('CREAT')) return 'Evento creado'
    if (normalized.includes('CANCEL')) return 'Evento cancelado'
    if (normalized.includes('UNPUBLISH')) return 'Evento despublicado'
    if (normalized.includes('PUBLISH')) return 'Evento publicado'
    if (normalized.includes('VISIBIL'))
      return 'Visibilidad del evento actualizada'
    if (normalized.includes('STATUS') || normalized.includes('STATE')) {
      return 'Estado del evento actualizado'
    }
    if (normalized.includes('UPDAT') || normalized.includes('EDIT')) {
      return 'Evento actualizado'
    }
    if (normalized.includes('DELET')) return 'Evento eliminado'
  }

  if (resource === 'news') {
    if (normalized.includes('CREAT')) return 'Noticia creada'
    if (normalized.includes('UNPUBLISH')) return 'Noticia despublicada'
    if (normalized.includes('PUBLISH')) return 'Noticia publicada'
    if (normalized.includes('STATUS') || normalized.includes('STATE')) {
      return 'Estado de la noticia actualizado'
    }
    if (normalized.includes('UPDAT') || normalized.includes('EDIT')) {
      return 'Noticia actualizada'
    }
    if (normalized.includes('DELET')) return 'Noticia eliminada'
  }

  return action
}

export function formatAuditScalarValue(
  field: string | undefined,
  value: HistoryValue,
): string | null {
  if (value === null) return 'Sin valor'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return null
  if (value === '') return 'Vacío'

  const upper = value.trim().toUpperCase()

  if (field && BOOLEAN_FIELDS.has(field)) {
    if (upper === 'TRUE' || value === '1') return 'Sí'
    if (upper === 'FALSE' || value === '0') return 'No'
  }

  if (field === 'status' && STATUS_LABELS[upper]) {
    return STATUS_LABELS[upper]
  }

  if (field === 'visibility' && VISIBILITY_LABELS[upper]) {
    return VISIBILITY_LABELS[upper]
  }

  if (field === 'destination_type' && DESTINATION_TYPE_LABELS[upper]) {
    return DESTINATION_TYPE_LABELS[upper]
  }

  if (field && DATE_FIELDS.has(field) && ISO_DATE_PATTERN.test(value.trim())) {
    return formatAuditDate(value.trim())
  }

  return value
}
