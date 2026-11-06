import { useCallback, useState } from 'react'
import { PortalHistory } from '@/features/portal-shared/PortalHistory'
import { getAdminEvent } from '../api/portalCalendarApi'
import { useCalendarResource } from '../hooks/useCalendarResource'
import type { AdminPortalEvent, EventCategory } from '../types'
import { CalendarModal } from './CalendarModal'
import { EventForm } from './EventForm'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'

function UnsavedChangesDialog({
  open,
  onContinue,
  onDiscard,
}: {
  open: boolean
  onContinue: () => void
  onDiscard: () => void
}) {
  return (
    <ConfirmDialog
      native
      isOpen={open}
      title="¿Descartar los cambios?"
      message="La información que no hayas guardado se perderá."
      cancelLabel="Seguir editando"
      confirmLabel="Descartar cambios"
      variant="danger"
      onCancel={onContinue}
      onConfirm={onDiscard}
    />
  )
}

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
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const requestClose = () => {
    if (busy) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }
  const load = useCallback(
    (signal: AbortSignal) =>
      eventId === null ? Promise.resolve(null) : getAdminEvent(eventId, signal),
    [eventId],
  )
  const resource = useCalendarResource(load)
  return (
    <>
      <CalendarModal
        drawer
        title={
          eventId === null
            ? 'Nuevo evento institucional'
            : 'Gestionar evento institucional'
        }
        busy={busy}
        closeBlocked={confirmClose}
        onClose={requestClose}
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
            onDirty={setDirty}
            onCancel={requestClose}
          />
        )}
      </CalendarModal>
      <UnsavedChangesDialog
        open={confirmClose}
        onContinue={() => setConfirmClose(false)}
        onDiscard={onClose}
      />
    </>
  )
}
