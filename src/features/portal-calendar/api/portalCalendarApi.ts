import { httpClient } from '@/shared/api/httpClient'
import {
  getApiErrorMessage,
  getApiFieldErrors,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'
import type {
  AdminPortalEvent,
  EventCategory,
  EventInput,
  EventPage,
  EventQuery,
  EventStatus,
  EventVisibility,
  PortalEvent,
} from '../types/calendar.types'

// Contract: backend 852fb54, docs/HU38_HU39_PORTAL_CALENDAR_API.md.
export async function getEventCategories(
  admin = false,
  signal?: AbortSignal,
): Promise<EventCategory[]> {
  const { data } = await httpClient.get<{ data: EventCategory[] }>(
    `${admin ? '/admin' : ''}/portal/event-categories`,
    { signal },
  )
  if (!Array.isArray(data.data))
    throw new Error('Formato de categorías no válido.')
  return data.data
}

async function listEvents<T>(
  path: string,
  query: EventQuery & { status?: EventStatus; visibility?: EventVisibility },
  signal?: AbortSignal,
): Promise<EventPage<T>> {
  const { data } = await httpClient.get<EventPage<T>>(path, {
    params: query,
    signal,
  })
  const meta = data.meta
  if (
    !Array.isArray(data.data) ||
    !meta ||
    !Number.isSafeInteger(meta.current_page) ||
    meta.current_page < 1 ||
    !Number.isSafeInteger(meta.last_page) ||
    meta.last_page < 1 ||
    !Number.isSafeInteger(meta.per_page) ||
    meta.per_page < 1 ||
    !Number.isSafeInteger(meta.total) ||
    meta.total < 0
  ) {
    throw new Error('Formato de eventos no válido.')
  }
  return data
}

export async function getPublicEvents(
  query: EventQuery,
  signal?: AbortSignal,
): Promise<PortalEvent[]> {
  const events = new Map<number, PortalEvent>()
  let page = 1
  let lastPage: number
  do {
    const result = await listEvents<PortalEvent>(
      '/portal/events',
      { ...query, page, per_page: 100 },
      signal,
    )
    if (result.meta.current_page !== page)
      throw new Error('Página de eventos no válida.')
    result.data.forEach((event) => events.set(event.id, event))
    lastPage = result.meta.last_page
    page++
  } while (page <= lastPage)
  return [...events.values()]
}

export function getAdminEvents(
  query: EventQuery & { status?: EventStatus; visibility?: EventVisibility },
  signal?: AbortSignal,
) {
  return listEvents<AdminPortalEvent>('/admin/portal/events', query, signal)
}

export async function getPublicEvent(
  id: number,
  signal?: AbortSignal,
): Promise<PortalEvent> {
  const { data } = await httpClient.get<{ data: PortalEvent }>(
    `/portal/events/${id}`,
    { signal },
  )
  return data.data
}

export async function getAdminEvent(
  id: number,
  signal?: AbortSignal,
): Promise<AdminPortalEvent> {
  const { data } = await httpClient.get<{ data: AdminPortalEvent }>(
    `/admin/portal/events/${id}`,
    { signal },
  )
  return data.data
}

export async function createEvent(
  input: EventInput,
): Promise<AdminPortalEvent> {
  const { data } = await httpClient.post<{ data: AdminPortalEvent }>(
    '/admin/portal/events',
    input,
  )
  return data.data
}

export async function editEvent(
  id: number,
  input: Partial<EventInput>,
  revision: number,
): Promise<AdminPortalEvent> {
  const { data } = await httpClient.patch<{ data: AdminPortalEvent }>(
    `/admin/portal/events/${id}`,
    { ...input, revision },
  )
  return data.data
}

export async function changeEventStatus(
  id: number,
  status: EventStatus,
  revision: number,
): Promise<AdminPortalEvent> {
  const { data } = await httpClient.patch<{ data: AdminPortalEvent }>(
    `/admin/portal/events/${id}/status`,
    { status, revision },
  )
  return data.data
}

export function getCalendarError(cause: unknown) {
  const status = getRequestStatus(cause)
  const fields = status === 422 ? getApiFieldErrors(cause) : {}
  const messages: Record<number, string> = {
    401: 'Tu sesión ha caducado. Inicia sesión nuevamente.',
    403: 'No tienes permisos para realizar esta operación.',
    404: 'El evento no existe o ya no está disponible.',
    409: 'El evento fue modificado por otro usuario. Actualiza la información antes de continuar.',
  }
  const message =
    status === 422
      ? (Object.values(fields)[0] ??
        getApiErrorMessage(cause) ??
        'Revisa los datos del evento.')
      : (messages[status ?? 0] ??
        'No se pudo completar la consulta. Inténtalo nuevamente.')
  return { status, fields, message }
}
