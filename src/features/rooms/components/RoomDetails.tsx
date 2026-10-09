import type { Room } from '../types/room.types'
import styles from './RoomDialog.module.css'

export function RoomDetails({
  room,
  onEdit,
  onClose,
}: {
  room: Room
  onEdit: () => void
  onClose: () => void
}) {
  const fields = [
    ['Código', room.code],
    ['Nombre', room.name],
    ['Ubicación', room.location],
    ['Piso', room.floor],
    ['Capacidad', room.capacity == null ? null : String(room.capacity)],
    ['Estado', room.status === 'ACTIVE' ? 'Activo' : 'Inactivo'],
    [
      'Disponibilidad actual',
      room.status === 'INACTIVE'
        ? 'No habilitada'
        : room.availability === 'AVAILABLE'
          ? 'Disponible'
          : room.availability === 'OCCUPIED'
            ? 'Ocupada'
            : 'Sin información',
    ],
    ['Descripción', room.description],
  ]
  return (
    <>
      <dl className={styles.details}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || 'Sin información'}</dd>
          </div>
        ))}
      </dl>
      {room.current_exam && (
        <section className={styles.exam} aria-label="Examen actual">
          <h3>Examen actual</h3>
          <p>{room.current_exam.name}</p>
          <p>
            {room.current_exam.exam_date} ·{' '}
            {room.current_exam.start_time.slice(0, 5)} –{' '}
            {room.current_exam.end_time.slice(0, 5)}
          </p>
        </section>
      )}
      <footer className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onClose}
        >
          Cerrar
        </button>
        <button type="button" className={styles.primaryButton} onClick={onEdit}>
          Editar aula
        </button>
      </footer>
    </>
  )
}
