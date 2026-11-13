import { useRef, useState } from 'react'
import { RoomApiError, updateAdminRoomStatus } from '../api/adminRoomsApi'
import type { Room } from '../types/room.types'
import { RoomModal } from './RoomModal'
import { Button } from '@/shared/components/ui/Button/Button'
import styles from './RoomDialog.module.css'

export function RoomStatusDialog({
  room,
  onClose,
  onChanged,
}: {
  room: Room
  onClose: () => void
  onChanged: (room: Room) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const pending = useRef(false)
  const activating = room.status === 'INACTIVE'
  function close() {
    if (!pending.current) onClose()
  }
  async function confirm() {
    if (pending.current || missing) return
    pending.current = true
    setSaving(true)
    setError(null)
    try {
      onChanged(
        await updateAdminRoomStatus(
          room.id,
          activating ? 'ACTIVE' : 'INACTIVE',
        ),
      )
    } catch (cause) {
      const error =
        cause instanceof RoomApiError
          ? cause
          : new RoomApiError('No se pudo cambiar el estado del aula.')
      setError(error.message)
      setMissing(error.status === 404)
    } finally {
      pending.current = false
      setSaving(false)
    }
  }
  return (
    <RoomModal
      title={activating ? 'Activar aula' : 'Desactivar aula'}
      busy={saving}
      onClose={close}
    >
      <p>
        <strong>
          {room.code} · {room.name || 'Sin nombre'}
        </strong>
      </p>
      <p className={styles.help}>
        {activating
          ? 'El aula volverá a estar habilitada para programar exámenes, según su disponibilidad.'
          : 'El aula dejará de estar habilitada para programar nuevos exámenes.'}
      </p>
      <p className={styles.help}>
        Los exámenes relacionados y su historial se conservarán.
      </p>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <footer className={styles.actions}>
        <Button variant="secondary" disabled={saving} onClick={close}>
          Cancelar
        </Button>
        <Button
          loading={saving}
          disabled={missing}
          onClick={() => void confirm()}
        >
          {saving
            ? 'Procesando…'
            : activating
              ? 'Sí, activar'
              : 'Sí, desactivar'}
        </Button>
      </footer>
    </RoomModal>
  )
}
