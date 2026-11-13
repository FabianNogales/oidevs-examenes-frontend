import { Navigate, useParams, useSearchParams } from 'react-router'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import { useInfractions } from '../hooks/useInfractions'
import { InfractionLayout } from '../components/InfractionLayout'
import {
  INFRACTION_STATUS_LABELS,
  INFRACTION_TYPE_LABELS,
  positiveId,
} from '../utils/infractionValidation'
import type { Infraction } from '../types/infraction.types'
import styles from '@/features/incidents/pages/Incidents.module.css'
import { InvalidExamPage } from '@/features/exams/components/InvalidExamPage'

type Row = Omit<Infraction, 'status'> & {
  infraction_status: Infraction['status']
}
const columns: TableColumnDef<Row>[] = [
  {
    id: 'student',
    header: 'Estudiante',
    cell: (item) => (
      <>
        {item.student.first_names} {item.student.last_names}
        <span className={styles.secondary}>SIS {item.student.sis_code}</span>
      </>
    ),
  },
  {
    id: 'type',
    header: 'Infracción',
    cell: (item) => (
      <>
        <strong>
          #{item.id} · {INFRACTION_TYPE_LABELS[item.type]}
        </strong>
      </>
    ),
  },
  {
    id: 'infraction_status',
    header: 'Estado',
    cell: (item) => INFRACTION_STATUS_LABELS[item.infraction_status],
  },
  {
    id: 'date',
    header: 'Fecha y hora',
    cell: (item) => formatIncidentDate(item.occurred_at),
  },
]
export function InfractionRecords({
  examId,
  embedded = false,
}: {
  examId: number
  embedded?: boolean
}) {
  const [params, setParams] = useSearchParams()
  const page = params.has('page') ? Number(params.get('page')) : 1
  const list = useInfractions(examId, page)
  const response = list.data
  return (
    <InfractionLayout
      embedded={embedded}
      examId={examId}
      exam={response?.exam}
      title="Infracciones del examen"
    >
      <p className={styles.note}>
        Una infracción reportada no está confirmada. Los cambios de estado
        requieren una decisión autorizada y conservan su historial.
      </p>
      <DataTable<Row>
        columns={columns}
        data={(response?.data ?? []).map(({ status, ...item }) => ({
          ...item,
          infraction_status: status,
        }))}
        loading={list.loading}
        error={list.error}
        onRetry={list.retry}
        entityLabel="infracciones"
        viewActionLabel="Ver detalle"
        getProfilePath={(item) =>
          `/teacher/exams/${examId}/infractions/${item.id}${page > 1 ? `?page=${page}` : ''}`
        }
        emptyTitle="No hay infracciones registradas"
        emptyDescription="Aquí aparecerán los registros autorizados de este examen."
        pagination={
          response
            ? {
                currentPage: response.meta.current_page,
                lastPage: response.meta.last_page,
                total: response.meta.total,
              }
            : null
        }
        onPageChange={(value) =>
          setParams((current) => {
            const next = new URLSearchParams(current)
            next.set('page', String(value))
            return next
          })
        }
      />
    </InfractionLayout>
  )
}
export function ExamInfractionsPage() {
  const { examId } = useParams()
  const id = Number(examId)
  return positiveId(id) ? (
    <Navigate
      replace
      to={`/exams/${id}/incidents?from=teacher&kind=INFRACTION`}
    />
  ) : (
    <InvalidExamPage
      title="Infracciones del examen"
      message="El identificador del examen no es válido."
    />
  )
}
