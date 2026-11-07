import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import type {
  AttendancePage,
  AttendanceStudent,
} from '../types/attendance.types'
type Row = AttendanceStudent & { id: number }
const columns: TableColumnDef<Row>[] = [
  {
    id: 'student',
    header: 'Estudiante',
    cell: (s) => (
      <>
        {s.first_names} {s.last_names}
      </>
    ),
  },
  { id: 'sis', header: 'SIS', cell: (s) => s.sis_code },
  {
    id: 'attendance',
    header: 'Asistencia',
    cell: (s) =>
      s.attendance_status === 'SERVER_CONFIRMED'
        ? 'Confirmada por servidor'
        : 'Pendiente de ingreso',
  },
  {
    id: 'date',
    header: 'Fecha y hora de ingreso',
    cell: (s) =>
      s.entry ? formatIncidentDate(s.entry.entered_at) : 'Sin ingreso válido',
  },
  {
    id: 'method',
    header: 'Método',
    cell: (s) =>
      s.entry?.verification_method === 'QR' ? 'QR' : s.entry ? 'Manual' : '—',
  },
]
export function AttendanceStudents({
  page,
  loading,
  error,
  onRetry,
  onPage,
}: {
  page: AttendancePage | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onPage: (page: number) => void
}) {
  return (
    <DataTable<Row>
      columns={columns}
      data={(page?.data ?? []).map((s) => ({ ...s, id: s.student_id }))}
      loading={loading}
      error={error}
      onRetry={onRetry}
      entityLabel="estudiantes"
      emptyTitle="No hay estudiantes en esta consulta"
      emptyDescription="Prueba otro filtro o búsqueda. El resumen conserva el alcance completo del examen."
      pagination={
        page
          ? {
              currentPage: page.meta.current_page,
              lastPage: page.meta.last_page,
              total: page.meta.total,
              from: page.data.length
                ? (page.meta.current_page - 1) * page.meta.per_page + 1
                : 0,
              to: page.data.length
                ? (page.meta.current_page - 1) * page.meta.per_page +
                  page.data.length
                : 0,
            }
          : null
      }
      onPageChange={onPage}
    />
  )
}
