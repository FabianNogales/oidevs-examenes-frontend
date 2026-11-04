import { useCallback, useState } from 'react'
import { PortalHistory } from '@/features/portal-shared/PortalHistory'
import { getAdminEvent } from '../api/portalCalendarApi'
import { useCalendarResource } from '../hooks/useCalendarResource'
import type { AdminPortalEvent, EventCategory } from '../types'
import { CalendarModal } from './CalendarModal'
import { EventForm } from './EventForm'

export function AdminEventDialog({
  eventId,
  categories,
  onClose,
  onSaved,
}: {
  eventId: number | null
  categories: EventCategory[]
  onClose: () => void
  onSaved: (event: AdminPortalEvent) => void
}) {
  const [busy, setBusy] = useState(false)
  const load = useCallback(
    (signal: AbortSignal) =>
      eventId === null ? Promise.resolve(null) : getAdminEvent(eventId, signal),
    [eventId],
  )
  const resource = useCalendarResource(load)
  return (
    <CalendarModal
      title={
        eventId === null
          ? 'Crear evento institucional'
          : 'Gestionar evento institucional'
      }
      busy={busy}
      onClose={onClose}
    >
      {eventId !== null ? (
        <PortalHistory resource="events" id={eventId} />
      ) : null}
      {resource.loading ? (
        <p role="status">Cargando evento…</p>
      ) : resource.error ? (
        <div role="alert">
          <p>{resource.error.message}</p>
          <button type="button" onClick={resource.reload}>
            Reintentar
          </button>
        </div>
      ) : (
        <EventForm
          key={eventId ?? 'new'}
          initial={resource.data}
          categories={categories}
          onSaved={onSaved}
          onBusy={setBusy}
        />
      )}
    </CalendarModal>
  )
}
