import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import { INCIDENT_TYPE_LABELS } from '@/features/incidents/utils/incidentValidation'
import {
  INFRACTION_TYPE_LABELS,
  INFRACTION_STATUS_LABELS,
} from '@/features/infractions/utils/infractionValidation'
import type { IncidentType } from '@/features/incidents/types/incident.types'
import type {
  InfractionType,
  InfractionStatus,
} from '@/features/infractions/types/infraction.types'
import type { ExamReportPage, ReportRow } from '../types/report.types'
import styles from '../pages/ExamReports.module.css'
type Row = ReportRow & { id: string }
function condition(r: ReportRow) {
  if (r.record_type === 'INFRACTION')
    return INFRACTION_STATUS_LABELS[r.state as InfractionStatus]
  return (
    (
      {
        ENROLLED: 'Inscrito',
        VALID: 'Ingreso confirmado',
        PENDING: 'Pendiente de ingreso',
        ABSENT: 'Ausente',
        EXPELLED: 'Expulsado',
        REPORTED: 'Reportada',
        REGISTERED: 'Registrada',
        RESOLVED: 'Resuelta',
      } as Record<string, string>
    )[r.state] ?? r.state
  )
}
function detail(r: ReportRow) {
  return (
    <>
      <strong>
        {r.record_type === 'INCIDENT'
          ? INCIDENT_TYPE_LABELS[r.category as IncidentType]
          : r.record_type === 'INFRACTION'
            ? INFRACTION_TYPE_LABELS[r.category as InfractionType]
            : 'Expulsión'}{' '}
        · #{r.source_id}
      </strong>
      <small className={styles.secondary}>
        {condition(r)}
        {r.origin
          ? ` · ${r.origin === 'AUTOMATIC' ? 'Rechazo automático' : 'Reporte manual'}`
          : ''}
      </small>
      <p className={styles.text}>{r.description}</p>
      {r.related_infraction_id && (
        <small>Infracción vinculada #{r.related_infraction_id}</small>
      )}
    </>
  )
}
export function ReportRecords({
  page,
  onPage,
}: {
  page: ExamReportPage
  onPage: (n: number) => void
}) {
  const type = page.report.type
  const columns: TableColumnDef<Row>[] = [
    {
      id: 'student',
      header: 'Estudiante',
      cell: (r) =>
        r.student
          ? `${r.student.first_names} ${r.student.last_names}`
          : 'Sin estudiante identificado',
    },
    {
      id: 'sis',
      header: 'SIS',
      cell: (r) => r.student?.sis_code ?? 'No disponible',
    },
  ]
  if (type === 'INCIDENTS' || type === 'DISCIPLINARY')
    columns.push({ id: 'event', header: 'Registro y motivo', cell: detail })
  else columns.push({ id: 'condition', header: 'Condición', cell: condition })
  if (!['ENROLLED', 'PENDING_ABSENT'].includes(type))
    columns.push(
      {
        id: 'date',
        header: 'Fecha y hora',
        cell: (r) =>
          r.occurred_at ? formatIncidentDate(r.occurred_at) : 'No disponible',
      },
      {
        id: 'actor',
        header: 'Responsable',
        cell: (r) => r.recorded_by?.name ?? 'No disponible',
      },
    )
  if (type === 'ATTENDANCE')
    columns.push({
      id: 'method',
      header: 'Método',
      cell: (r) => (r.method === 'QR' ? 'QR' : 'Manual'),
    })
  return (
    <DataTable<Row>
      columns={columns}
      data={page.data.map((r) => ({
        ...r,
        id: `${r.record_type}:${r.source_id}`,
      }))}
      loading={false}
      entityLabel="registros"
      emptyTitle="El reporte no tiene registros"
      emptyDescription="No hay registros autorizados que coincidan con el examen y los filtros aplicados."
      pagination={{
        currentPage: page.meta.current_page,
        lastPage: page.meta.last_page,
        total: page.meta.total,
      }}
      onPageChange={onPage}
    />
  )
}
