import { useState } from 'react'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import { useExpulsionHistory } from '../hooks/useExpulsionQuery'
import type { ExpulsionHistory } from '../types/expulsion.types'
import styles from '@/features/infractions/components/InfractionManagement.module.css'
type Row = ExpulsionHistory['data'][number] & { id: number }
const columns: TableColumnDef<Row>[] = [
  {
    id: 'exam',
    header: 'Examen',
    cell: (v) => (
      <>
        {v.exam.name} · {v.exam.subject_name}
      </>
    ),
  },
  { id: 'reason', header: 'Motivo', cell: (v) => v.expulsion.reason },
  {
    id: 'date',
    header: 'Fecha y hora',
    cell: (v) => formatIncidentDate(v.expulsion.expelled_at),
  },
  {
    id: 'responsible',
    header: 'Responsable',
    cell: (v) => v.expulsion.expelled_by.name,
  },
]
function History({ examId, studentId }: { examId: number; studentId: number }) {
  const [page, setPage] = useState(1)
  const query = useExpulsionHistory(examId, studentId, page),
    r = query.data
  return (
    <DataTable<Row>
      columns={columns}
      data={(r?.data ?? []).map((v) => ({ ...v, id: v.expulsion.id }))}
      loading={query.loading}
      error={query.error}
      onRetry={query.retry}
      entityLabel="expulsiones"
      emptyTitle="Sin expulsiones anteriores disponibles"
      emptyDescription="No hay registros dentro del alcance autorizado de esta consulta."
      pagination={
        r
          ? {
              currentPage: r.meta.current_page,
              lastPage: r.meta.last_page,
              total: r.meta.total,
            }
          : null
      }
      onPageChange={setPage}
    />
  )
}
export function StudentExpulsionHistory({
  examId,
  studentId,
}: {
  examId: number
  studentId: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className={styles.section}>
      <h2>Historial de expulsiones del estudiante</h2>
      <p>
        Consulta los registros disponibles según tus permisos; no concede acceso
        a otros exámenes ni altera decisiones anteriores.
      </p>
      {open ? (
        <History examId={examId} studentId={studentId} />
      ) : (
        <button
          className={styles.button}
          type="button"
          onClick={() => setOpen(true)}
        >
          Consultar historial
        </button>
      )}
    </section>
  )
}
