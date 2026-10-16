import type { Room } from '../types/room.types'
import styles from '../pages/AdminRoomsPage.module.css'

function CurrentExam({ exam }: { exam: Room['current_exam'] }) {
  if (exam === undefined)
    return <span className={styles.muted}>Sin información</span>
  if (!exam) return <span className={styles.muted}>Sin examen en curso</span>
  const parts = exam.exam_date.split('-')
  const date =
    parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : exam.exam_date
  return (
    <>
      <strong>{exam.name}</strong>
      <small>
        {exam.start_time.slice(0, 5)} – {exam.end_time.slice(0, 5)} · {date}
      </small>
    </>
  )
}

export function RoomsTable({
  rooms,
  onDetail,
  onEdit,
  onStatusChange,
}: {
  rooms: Room[]
  onDetail: (roomId: number) => void
  onEdit: (roomId: number) => void
  onStatusChange: (room: Room) => void
}) {
  return (
    <div
      className={styles.tableScroll}
      role="region"
      aria-label="Listado de aulas"
      tabIndex={0}
    >
      <table className={styles.table}>
        <caption className={styles.srOnly}>
          Aulas y ambientes registrados
        </caption>
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Nombre / ubicación</th>
            <th scope="col">Capacidad</th>
            <th scope="col">Estado</th>
            <th scope="col">Disponibilidad actual</th>
            <th scope="col">Examen actual</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id}>
              <th scope="row" data-label="Código">
                {room.code}
              </th>
              <td data-label="Nombre / ubicación">
                <strong>{room.name || 'Sin nombre'}</strong>
                <small>
                  {room.location ||
                    room.description ||
                    'Sin ubicación registrada'}
                </small>
              </td>
              <td data-label="Capacidad">{room.capacity ?? '—'}</td>
              <td data-label="Estado">
                <span
                  className={
                    room.status === 'ACTIVE'
                      ? styles.successBadge
                      : styles.neutralBadge
                  }
                >
                  {room.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td data-label="Disponibilidad actual">
                {room.status === 'INACTIVE' ? (
                  <span className={styles.muted}>No habilitada</span>
                ) : (
                  <span
                    className={
                      room.availability === 'AVAILABLE'
                        ? styles.successBadge
                        : room.availability === 'OCCUPIED'
                          ? styles.warningBadge
                          : styles.neutralBadge
                    }
                  >
                    {room.availability === 'AVAILABLE'
                      ? 'Disponible'
                      : room.availability === 'OCCUPIED'
                        ? 'Ocupada'
                        : 'Sin información'}
                  </span>
                )}
              </td>
              <td data-label="Examen actual">
                <CurrentExam exam={room.current_exam} />
              </td>
              <td data-label="Acciones">
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => onDetail(room.id)}
                    aria-label={`Ver detalle de ${room.code}`}
                  >
                    Ver detalle
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => onEdit(room.id)}
                    aria-label={`Editar ${room.code}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={
                      room.status === 'ACTIVE'
                        ? styles.deactivateButton
                        : styles.secondaryButton
                    }
                    onClick={() => onStatusChange(room)}
                    aria-label={`${room.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} ${room.code}`}
                  >
                    {room.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
