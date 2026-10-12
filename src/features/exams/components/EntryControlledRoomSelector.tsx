import { useId } from 'react'
import type { Room } from '../types/exam.types'
import { entryRoomLabel } from '../utils/entryControlDisplay'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from '../pages/EntryControlPage.module.css'

type Props = {
  roomId: number | undefined
  rooms: Room[]
  loading: boolean
  error: string | null
  disabled?: boolean
  onChange: (roomId: number) => void
  onReload: () => void
}

export function EntryControlledRoomSelector({
  roomId,
  rooms,
  loading,
  error,
  disabled = false,
  onChange,
  onReload,
}: Props) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>Ambiente controlado</label>
      <select
        id={id}
        value={roomId ?? ''}
        disabled={disabled || rooms.length === 0}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {!roomId ? (
          <option value="" disabled>
            {loading ? 'Cargando ambientes…' : 'Selecciona un ambiente'}
          </option>
        ) : null}
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {entryRoomLabel(room)}
          </option>
        ))}
      </select>
      {loading ? <small role="status">Consultando ambientes…</small> : null}
      {error ? (
        <div role="alert">
          <p className={sharedStyles.error}>{error}</p>
          <button
            type="button"
            className={sharedStyles.secondaryButton}
            disabled={disabled}
            onClick={onReload}
          >
            Reintentar ambientes
          </button>
        </div>
      ) : null}
    </div>
  )
}
