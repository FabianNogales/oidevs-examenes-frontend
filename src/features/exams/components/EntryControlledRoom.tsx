import type { Room } from '../types/exam.types'
import styles from '../pages/EntryControlPage.module.css'

export function EntryControlledRoom({
  room,
}: {
  room: Room | null | undefined
}) {
  return (
    <div className={styles.field}>
      <span>Ambiente controlado</span>
      <div className={styles.controlledRoomValue}>
        {room ? (
          <>
            <strong>
              {room.code} — {room.name}
            </strong>
            {room.location ? <span>{room.location}</span> : null}
          </>
        ) : (
          <span>Sin ambiente asignado</span>
        )}
      </div>
    </div>
  )
}
