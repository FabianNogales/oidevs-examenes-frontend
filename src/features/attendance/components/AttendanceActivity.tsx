import { useCallback } from 'react'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { getAttendanceActivity } from '../api/attendanceApi'
import { useAttendanceFeed } from '../hooks/useAttendanceFeed'
import type { AttendanceCollaborator } from '../types/attendance.types'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import styles from '../pages/Attendance.module.css'
type Row = AttendanceCollaborator & { id: number }
const roles = {
  RESPONSIBLE_TEACHER: 'Docente responsable',
  COLLABORATOR: 'Colaborador',
  HISTORICAL_VERIFIER: 'Registrador anterior',
}
const columns: TableColumnDef<Row>[] = [
  { id: 'name', header: 'Responsable', cell: (r) => r.name },
  { id: 'role', header: 'Participación', cell: (r) => roles[r.role] },
  {
    id: 'valid',
    header: 'Ingresos válidos registrados',
    cell: (r) => r.valid_registered,
  },
  {
    id: 'assigned',
    header: 'Asignados',
    cell: (r) => r.assigned_total ?? 'No disponible',
  },
  {
    id: 'pending',
    header: 'Pendientes de su lista',
    cell: (r) => r.pending ?? 'No disponible',
  },
  {
    id: 'progress',
    header: 'Avance de lista',
    cell: (r) =>
      r.attendance_percentage === null
        ? 'No disponible'
        : `${r.attendance_percentage}%`,
  },
]
export function AttendanceActivity({
  examId,
  onList,
}: {
  examId: number
  onList: (id: number) => void
}) {
  const load = useCallback(
    (signal: AbortSignal) => getAttendanceActivity(examId, signal),
    [examId],
  )
  const q = useAttendanceFeed(`activity:${examId}`, load),
    r = q.data
  return (
    <section className={styles.section}>
      <h2>Actividad por colaborador</h2>
      <p>
        Ingresos válidos registrados por cada usuario. Esta actividad no
        representa una distribución de estudiantes entre listas.
      </p>
      {q.paused && (
        <p role="status">
          Consulta pausada. Se actualizará al recuperar conexión y volver a esta
          pantalla.
        </p>
      )}
      {r && (
        <>
          <p role="status">
            {q.refreshing ? 'Actualizando… ' : ''}Última consulta de actividad:{' '}
            {formatIncidentDate(r.last_updated_at)}.
          </p>
          {!r.exclusive_lists.available && (
            <p>
              El examen no dispone de listas exclusivas para consultar su
              avance.
            </p>
          )}
          {r.exclusive_lists.available && (
            <div className={styles.listButtons}>
              {r.exclusive_lists.data?.map((l) => (
                <button key={l.id} type="button" onClick={() => onList(l.id)}>
                  {l.name} · {l.collaborator.name} · Ver lista
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <DataTable<Row>
        columns={
          r?.collaborators.progress_by_assigned_list_available
            ? columns
            : columns.slice(0, 3)
        }
        data={(r?.collaborators.data ?? []).map((v) => ({
          ...v,
          id: v.user_id,
        }))}
        loading={q.refreshing && !r && !q.error}
        error={
          q.paused
            ? 'Consulta de actividad pausada hasta recuperar conexión.'
            : q.error
        }
        onRetry={q.retry}
        entityLabel="colaboradores"
        emptyTitle="No hay actividad disponible"
        emptyDescription="No se han recibido registros de actividad autorizados."
      />
    </section>
  )
}
