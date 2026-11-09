import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import {
  positiveId,
  INFRACTION_TYPE_LABELS,
  INFRACTION_STATUS_LABELS,
} from '@/features/infractions/utils/infractionValidation'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import { useExpulsion } from '../hooks/useExpulsionQuery'
import { ExpulsionLayout } from '../components/ExpulsionLayout'
import { StudentExpulsionHistory } from '../components/StudentExpulsionHistory'
import styles from '@/features/infractions/components/InfractionManagement.module.css'
import { InvalidExamPage } from '@/features/exams/components/InvalidExamPage'
function Detail({ examId, id }: { examId: number; id: number }) {
  const query = useExpulsion(examId, id),
    location = useLocation()
  const [params] = useSearchParams()
  const page = Number(params.get('page')),
    r = query.data?.data
  return (
    <ExpulsionLayout
      examId={examId}
      exam={query.data?.exam}
      title="Detalle de expulsión"
      detail
    >
      {query.loading ? (
        <p role="status">Consultando expulsión…</p>
      ) : query.error ? (
        <div role="alert">
          <p>{query.error}</p>
          <button type="button" onClick={query.retry}>
            Reintentar
          </button>
        </div>
      ) : (
        r && (
          <>
            {location.state?.createdExpulsionId === r.id && (
              <p role="status">La expulsión fue registrada correctamente.</p>
            )}
            <section className={styles.section}>
              <h2>
                {r.student.first_names} {r.student.last_names}
              </h2>
              <p>
                SIS {r.student.sis_code}
                {r.student.identity_number
                  ? ` · CI ${r.student.identity_number}`
                  : ''}
              </p>
              <p>
                <strong>Estado en este examen: Expulsado</strong>
              </p>
              <p>
                Registro #{r.id} · {formatIncidentDate(r.expelled_at)}
              </p>
              <p>Responsable: {r.expelled_by.name}</p>
              <h2>Motivo de expulsión</h2>
              <p className={styles.text}>{r.reason}</p>
              <h2>Infracción relacionada</h2>
              {r.infraction ? (
                <p>
                  <Link
                    to={`/teacher/exams/${examId}/infractions/${r.infraction.id}`}
                  >
                    Infracción #{r.infraction.id} ·{' '}
                    {INFRACTION_TYPE_LABELS[r.infraction.type]}
                  </Link>{' '}
                  · {INFRACTION_STATUS_LABELS[r.infraction.status]}
                </p>
              ) : (
                <p>Sin infracción vinculada.</p>
              )}
              <p>
                La expulsión no elimina la asistencia ni los antecedentes
                registrados.
              </p>
            </section>
            <StudentExpulsionHistory
              key={`${examId}:${r.student.id}`}
              examId={examId}
              studentId={r.student.id}
            />
          </>
        )
      )}
      <p>
        <Link
          to={`/teacher/exams/${examId}/expulsions${positiveId(page) && page > 1 ? `?page=${page}` : ''}`}
        >
          Volver a expulsiones
        </Link>
      </p>
    </ExpulsionLayout>
  )
}
export function ExpulsionDetailPage() {
  const { examId, expulsionId } = useParams()
  const exam = Number(examId),
    id = Number(expulsionId)
  return positiveId(exam) && positiveId(id) ? (
    <Detail key={`${exam}:${id}`} examId={exam} id={id} />
  ) : (
    <InvalidExamPage
      title="Detalle de expulsión"
      message="El identificador solicitado no es válido."
    />
  )
}
