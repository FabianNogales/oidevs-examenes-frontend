import type { AttendanceSnapshot } from '../types/attendance.types'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import styles from '../pages/Attendance.module.css'
export function AttendanceSummary({
  snapshot,
  refreshing,
}: {
  snapshot: AttendanceSnapshot
  refreshing: boolean
}) {
  const s = snapshot.summary
  return (
    <section
      aria-label="Asistencia oficial del examen"
      className={styles.panel}
    >
      <div className={styles.cards}>
        {[
          ['Inscritos', s.total_students],
          ['Ingresos oficiales', s.registered],
          ['Pendientes de ingreso', s.pending],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className={styles.progress}>
        <p>
          <strong>
            {s.attendance_percentage.toLocaleString('es-BO', {
              maximumFractionDigits: 2,
            })}
            % de asistencia
          </strong>{' '}
          · solo ingresos válidos del servidor
        </p>
        <progress
          value={s.registered}
          max={s.total_students || 1}
          aria-label="Porcentaje de asistencia oficial"
        />
      </div>
      <p role="status">
        {refreshing ? 'Actualizando la consulta… ' : ''}Última consulta
        confirmada: {formatIncidentDate(snapshot.last_updated_at)}.
      </p>
      <p>
        Alcance: inscripciones activas de la materia. Los ingresos anulados no
        se cuentan como asistencia válida.
      </p>
      <div className={styles.offline}>
        <strong>
          Pendientes de sincronización:{' '}
          {snapshot.offline.available_on_server
            ? snapshot.offline.pending_count
            : 'información no disponible'}
        </strong>
        <p>
          Los ingresos offline pendientes no forman parte de la asistencia
          oficial. Una cantidad no disponible no significa que no existan
          pendientes en otros dispositivos.
        </p>
      </div>
    </section>
  )
}
