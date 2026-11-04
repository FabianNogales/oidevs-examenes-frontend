import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import type { Incident, IncidentsPage } from '../types/incident.types'
import { INCIDENT_TYPE_LABELS } from '../utils/incidentValidation'
import {
  formatIncidentDate,
  incidentStatusLabel,
} from '../utils/incidentDisplay'
import styles from '../pages/Incidents.module.css'

type Row = Omit<Incident, 'status'> & { incident_status: string }
type Props = {
  data: Incident[]
  meta?: IncidentsPage['meta']
  loading: boolean
  error: string | null
  retry: () => void
  setPage: (page: number) => void
  detailPath: (item: Incident) => string
  statuses?: { value: string; label: string }[]
  filtered?: boolean
}
export function IncidentRecordsTable({
  data,
  meta,
  loading,
  error,
  retry,
  setPage,
  detailPath,
  statuses = [],
  filtered = false,
}: Props) {
  const columns: TableColumnDef<Row>[] = [
    {
      id: 'type',
      header: 'Incidencia / tipo',
      cell: (item) => (
        <>
          <strong>
            #{item.id} · {INCIDENT_TYPE_LABELS[item.type]}
          </strong>
          <span className={styles.secondary}>{item.description}</span>
        </>
      ),
    },
    {
      id: 'student',
      header: 'Estudiante',
      cell: (item) =>
        item.student ? (
          <>
            {item.student.first_names} {item.student.last_names}
            <span className={styles.secondary}>
              SIS {item.student.sis_code}
            </span>
          </>
        ) : (
          'Sin estudiante identificado'
        ),
    },
    {
      id: 'origin',
      header: 'Origen',
      cell: (item) => (item.origin === 'MANUAL' ? 'Manual' : 'Automático'),
    },
    {
      id: 'date',
      header: 'Fecha y hora',
      cell: (item) => formatIncidentDate(item.created_at),
    },
    {
      id: 'author',
      header: 'Registrado por',
      cell: (item) => item.reported_by.name,
    },
    {
      id: 'incident_status',
      header: 'Estado',
      cell: (item) =>
        statuses.find((s) => s.value === item.incident_status)?.label ??
        incidentStatusLabel(item.incident_status),
    },
  ]
  return (
    <DataTable<Row>
      columns={columns}
      data={data.map(({ status, ...item }) => ({
        ...item,
        incident_status: status,
      }))}
      loading={loading}
      error={error}
      onRetry={retry}
      entityLabel="incidencias"
      emptyTitle={
        filtered
          ? 'No hay incidencias que coincidan con los filtros'
          : 'No hay incidencias registradas'
      }
      emptyDescription={
        filtered
          ? 'Prueba otra búsqueda o limpia los filtros para consultar todos los registros autorizados.'
          : 'Aquí se mostrarán los reportes manuales y eventos automáticos conservados por el servidor.'
      }
      pagination={
        meta
          ? {
              currentPage: meta.current_page,
              lastPage: meta.last_page,
              total: meta.total,
            }
          : null
      }
      onPageChange={setPage}
      viewActionLabel="Ver detalle"
      getProfilePath={(item) =>
        detailPath({ ...item, status: item.incident_status })
      }
    />
  )
}
