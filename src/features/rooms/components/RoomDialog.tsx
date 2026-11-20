import { useEffect, useRef, useState } from 'react'
import { getAdminRoom, getAdminRoomForEdit, RoomApiError } from '../api/adminRoomsApi'
import type { Room, RoomEditable, RoomDialogSelection } from '../types/room.types'
import { RoomDetails } from './RoomDetails'
import { RoomForm } from './RoomForm'
import { RoomModal } from './RoomModal'
import { Button } from '@/shared/components/ui/Button/Button'
import styles from './RoomDialog.module.css'

interface Props {
  selection: RoomDialogSelection
  onClose: () => void
  onSaved: (room: Room, created: boolean) => void
  canView: boolean
  canCreate: boolean
  canEdit: boolean
}

type RecordState =
  | { status: 'loading' }
  | { status: 'ready'; mode: 'detail'; room: Room }
  | { status: 'ready'; mode: 'edit'; room: RoomEditable }
  | { status: 'error'; message: string; missing: boolean }

function ExistingRoom({
  roomId,
  editing,
  onClose,
  onEdit,
  onSaved,
  onBusyChange,
}: {
  roomId: number
  editing: boolean
  onClose: () => void
  onEdit?: () => void
  onSaved: (room: Room) => void
  onBusyChange: (busy: boolean) => void
}) {
  const [state, setState] = useState<RecordState>({ status: 'loading' })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const loading = editing
      ? getAdminRoomForEdit(roomId, controller.signal).then((room) => {
          if (!controller.signal.aborted) setState({ status: 'ready', mode: 'edit', room })
        })
      : getAdminRoom(roomId, controller.signal).then((room) => {
          if (!controller.signal.aborted) setState({ status: 'ready', mode: 'detail', room })
        })
    loading.catch((cause: unknown) => {
      if (controller.signal.aborted) return
      const error =
        cause instanceof RoomApiError
          ? cause
          : new RoomApiError('No se pudo consultar el aula.')
      setState({
        status: 'error',
        message: error.message,
        missing: error.status === 404,
      })
    })
    return () => controller.abort()
  }, [roomId, retry, editing])

  if (state.status === 'loading')
    return (
      <p className={styles.loading} role="status">
        Cargando información del aula…
      </p>
    )
  if (state.status === 'error')
    return (
      <div className={styles.error} role="alert">
        <p>{state.message}</p>
        {!state.missing && (
          <Button
            variant="secondary"
            onClick={() => {
              setState({ status: 'loading' })
              setRetry((value) => value + 1)
            }}
          >
            Reintentar
          </Button>
        )}
      </div>
    )
  return state.mode === 'edit' ? (
    <RoomForm
      room={state.room}
      onCancel={onClose}
      onSaved={onSaved}
      onBusyChange={onBusyChange}
    />
  ) : (
    <RoomDetails room={state.room} onClose={onClose} onEdit={onEdit} />
  )
}

export function RoomDialog({
  selection, onClose, onSaved, canView, canCreate, canEdit,
}: Props) {
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(selection.mode === 'edit')
  const title =
    selection.mode === 'create'
      ? 'Registrar aula'
      : editing
        ? 'Editar aula'
        : 'Detalle del aula'

  function close() {
    if (!busy.current) onClose()
  }

  function changeBusy(value: boolean) {
    busy.current = value
    setSaving(value)
  }

  function saved(room: Room) {
    onSaved(room, selection.mode === 'create')
  }

  const allowed = selection.mode === 'create' ? canCreate : editing ? canEdit : canView

  return (
    <RoomModal title={title} busy={saving} onClose={close}>
      {!allowed ? (
        <p role="alert">No tienes permiso vigente para esta operación.</p>
      ) : selection.mode === 'create' ? (
        <RoomForm onCancel={close} onSaved={saved} onBusyChange={changeBusy} />
      ) : (
        <ExistingRoom
          key={editing ? 'edit' : 'detail'}
          roomId={selection.roomId}
          editing={editing}
          onClose={close}
          onEdit={canEdit ? () => setEditing(true) : undefined}
          onSaved={saved}
          onBusyChange={changeBusy}
        />
      )}
    </RoomModal>
  )
}
