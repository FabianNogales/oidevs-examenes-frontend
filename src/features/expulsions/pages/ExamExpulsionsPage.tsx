import { Navigate, useParams, useSearchParams } from 'react-router'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import { positiveId } from '@/features/infractions/utils/infractionValidation'
import { ExpulsionLayout } from '../components/ExpulsionLayout'
import { useExpulsions } from '../hooks/useExpulsionQuery'
import type { Expulsion } from '../types/expulsion.types'
import styles from '@/features/incidents/pages/Incidents.module.css'
import { InvalidExamPage } from '@/features/exams/components/InvalidExamPage'
type Row = Omit<Expulsion, 'status'> & { expulsion_status: Expulsion['status'] }
const columns: TableColumnDef<Row>[] = [
  {
    id: 'student',
    header: 'Estudiante',
    cell: (v) => (
      <>
        {v.student.first_names} {v.student.last_names}
        <span className={styles.secondary}>SIS {v.student.sis_code}</span>
      </>
    ),
  },
  {
    id: 'expulsion_status',
    header: 'Estado en el examen',
    cell: () => <strong>Expulsado</strong>,
  },
  {
    id: 'date',
    header: 'Fecha y hora',
    cell: (v) => formatIncidentDate(v.expelled_at),
  },
  { id: 'responsible', header: 'Responsable', cell: (v) => v.expelled_by.name },
]
export function ExpulsionRecords({
  examId,
  embedded = false,
}: {
  examId: number
  embedded?: boolean
}) {
  const [params, setParams] = useSearchParams()
  const page = params.has('page') ? Number(params.get('page')) : 1
  const query = useExpulsions(examId, page)
  const response = query.data
  return (
    <ExpulsionLayout
      embedded={embedded}
      examId={examId}
      exam={response?.exam}
      title="Expulsiones del examen"
    >
      <p className={styles.note}>
        Las expulsiones conservan los registros de asistencia, las infracciones
        y los antecedentes del estudiante.
      </p>
      <DataTable<Row>
        columns={columns}
        data={(response?.data ?? []).map(({ status, ...v }) => ({
          ...v,
          expulsion_status: status,
        }))}
        loading={query.loading}
        error={query.error}
        onRetry={query.retry}
        entityLabel="expulsiones"
        viewActionLabel="Ver detalle"
        getProfilePath={(v) =>
          v.infraction
            ? `/teacher/exams/${examId}/infractions/${v.infraction.id}`
            : `/teacher/exams/${examId}/expulsions/${v.id}${page > 1 ? `?page=${page}` : ''}`
        }
        emptyTitle="No hay expulsiones registradas"
        emptyDescription="Aquí aparecerán las expulsiones autorizadas de este examen."
        pagination={
          response
            ? {
                currentPage: response.meta.current_page,
                lastPage: response.meta.last_page,
                total: response.meta.total,
              }
            : null
        }
        onPageChange={(v) =>
          setParams((current) => {
            const next = new URLSearchParams(current)
            next.set('page', String(v))
            return next
          })
        }
      />
    </ExpulsionLayout>
  )
}
export function ExamExpulsionsPage() {
  const { examId } = useParams()
  const id = Number(examId)
  return positiveId(id) ? (
    <Navigate
      replace
      to={`/exams/${id}/incidents?from=teacher&measure=EXPELLED`}
    />
  ) : (
    <InvalidExamPage
      title="Expulsiones del examen"
      message="El identificador del examen no es válido."
    />
  )
}
