import { useCallback } from 'react'
import { getPublicEvent } from '../api/portalCalendarApi'
import { useCalendarResource } from '../hooks/useCalendarResource'
import { CalendarModal } from './CalendarModal'
import { EventDetails } from './EventDetails'

export function PublicEventDialog({
  eventId,
  onClose,
}: {
  eventId: number
  onClose: () => void
}) {
  const load = useCallback(
    (signal: AbortSignal) => getPublicEvent(eventId, signal),
    [eventId],
  )
  const resource = useCalendarResource(load)
  return (
    <CalendarModal title="Detalle del evento" onClose={onClose}>
      {resource.loading ? (
        <p role="status">Cargando evento…</p>
      ) : resource.error ? (
        <div role="alert">
          <p>{resource.error.message}</p>
          <button type="button" onClick={resource.reload}>
            Reintentar
          </button>
        </div>
      ) : resource.data ? (
        <EventDetails event={resource.data} />
      ) : null}
    </CalendarModal>
  )
}
