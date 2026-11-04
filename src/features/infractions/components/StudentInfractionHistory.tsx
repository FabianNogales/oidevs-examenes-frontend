import { useCallback, useState } from 'react'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { getStudentInfractions } from '../api/infractionsApi'
import { useInfractionResource } from '../hooks/useInfractionResource'
import {
  INFRACTION_STATUS_LABELS,
  INFRACTION_TYPE_LABELS,
} from '../utils/infractionValidation'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import styles from './InfractionManagement.module.css'

type Row = {
  id: number
  exam_name: string
  infraction_type: string
  infraction_status: string
  occurred_at: string
}
const columns: TableColumnDef<Row>[] = [
  { id: 'exam', header: 'Examen', accessorKey: 'exam_name' },
  { id: 'type', header: 'Tipo', accessorKey: 'infraction_type' },
  { id: 'state', header: 'Estado', accessorKey: 'infraction_status' },
  {
    id: 'date',
    header: 'Fecha y hora',
    cell: (item) => formatIncidentDate(item.occurred_at),
  },
]
function History({ examId, studentId }: { examId: number; studentId: number }) {
  const [page, setPage] = useState(1)
  const load = useCallback(
    (signal: AbortSignal) =>
      getStudentInfractions(examId, studentId, page, signal),
    [examId, studentId, page],
  )
  const resource = useInfractionResource(
    `student:${examId}:${studentId}:${page}`,
    load,
  )
  const response = resource.data
  return (
    <DataTable<Row>
      columns={columns}
      data={(response?.data ?? []).map((item) => ({
        id: item.infraction.id,
        exam_name: `${item.exam.name} · ${item.exam.subject_name}`,
        infraction_type: INFRACTION_TYPE_LABELS[item.infraction.type],
        infraction_status: INFRACTION_STATUS_LABELS[item.infraction.status],
        occurred_at: item.infraction.occurred_at,
      }))}
      loading={resource.loading}
      error={resource.error}
      onRetry={resource.retry}
      entityLabel="antecedentes"
      emptyTitle="No hay antecedentes disponibles"
      emptyDescription="No se encontraron infracciones dentro de tu alcance autorizado."
      pagination={
        response
          ? {
              currentPage: response.meta.current_page,
              lastPage: response.meta.last_page,
              total: response.meta.total,
            }
          : null
      }
      onPageChange={setPage}
    />
  )
}
export function StudentInfractionHistory({
  examId,
  studentId,
}: {
  examId: number
  studentId: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <section
      className={styles.section}
      aria-label="Antecedentes del estudiante"
    >
      <h2>Antecedentes del estudiante</h2>
      <p>
        Solo se muestran registros autorizados. Una falta reportada no se
        presenta como confirmada.
      </p>
      <button
        type="button"
        className={styles.button}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Ocultar antecedentes' : 'Consultar antecedentes'}
      </button>
      {open && (
        <History
          key={`${examId}:${studentId}`}
          examId={examId}
          studentId={studentId}
        />
      )}
    </section>
  )
}
