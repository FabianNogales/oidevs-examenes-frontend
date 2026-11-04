import { useCallback, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { getInfraction } from '../api/infractionsApi'
import { useInfractionResource } from '../hooks/useInfractionResource'
import { InfractionLayout } from '../components/InfractionLayout'
import { InfractionInformation } from '../components/InfractionInformation'
import { InfractionAuditTrail } from '../components/InfractionAuditTrail'
import { InfractionStatusForm } from '../components/InfractionStatusForm'
import { StudentInfractionHistory } from '../components/StudentInfractionHistory'
import {
  positiveId,
  INFRACTION_STATUS_LABELS,
} from '../utils/infractionValidation'
import styles from '../components/InfractionManagement.module.css'

function Detail({ examId, id }: { examId: number; id: number }) {
  const { state } = useLocation()
  const [params] = useSearchParams()
  const page = Number(params.get('page'))
  const back = `/teacher/exams/${examId}/infractions${positiveId(page) && page > 1 ? `?page=${page}` : ''}`
  const load = useCallback(
    (signal: AbortSignal) => getInfraction(examId, id, signal),
    [examId, id],
  )
  const resource = useInfractionResource(`detail:${examId}:${id}`, load)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const detail = resource.data
  return (
    <InfractionLayout
      examId={examId}
      exam={detail?.exam}
      title="Detalle de infracción"
      detail
    >
      {notice && <p role="status">{notice}</p>}
      {detail && !notice && state?.createdInfractionId === id && (
        <p role="status">
          Infracción registrada. Consulta su estado vigente y seguimiento.
        </p>
      )}
      {resource.loading ? (
        <p role="status">Consultando infracción y seguimiento…</p>
      ) : resource.error ? (
        <section className={styles.section} role="alert">
          <p>{resource.error}</p>
          <button
            type="button"
            className={styles.button}
            onClick={resource.retry}
          >
            Reintentar
          </button>
        </section>
      ) : detail ? (
        <>
          <InfractionInformation detail={detail} />
          {editing ? (
            <InfractionStatusForm
              key={detail.data.updated_at}
              detail={detail}
              onBusyChange={setBusy}
              onCancel={() => {
                if (!busy) {
                  setEditing(false)
                  resource.retry()
                }
              }}
              onSaved={(saved) => {
                setBusy(false)
                setEditing(false)
                setNotice(
                  `El servidor confirmó el estado: ${INFRACTION_STATUS_LABELS[saved.data.status]}.`,
                )
                resource.retry()
              }}
            />
          ) : (
            <section className={styles.section}>
              <h2>Gestión del estado</h2>
              {detail.data.permissions.can_update &&
              detail.data.permissions.allowed_statuses.length ? (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => {
                    setNotice(null)
                    setEditing(true)
                  }}
                >
                  Actualizar estado
                </button>
              ) : (
                <p>No hay cambios de estado autorizados para este registro.</p>
              )}
            </section>
          )}
          <InfractionAuditTrail events={detail.history} />
          {!busy && (
            <StudentInfractionHistory
              examId={examId}
              studentId={detail.data.student.id}
            />
          )}
        </>
      ) : null}
      <Link
        to={back}
        aria-disabled={busy}
        onClick={(event) => {
          if (busy) event.preventDefault()
        }}
      >
        Volver a infracciones
      </Link>
    </InfractionLayout>
  )
}
export function InfractionDetailPage() {
  const { examId, infractionId } = useParams()
  const exam = Number(examId),
    id = Number(infractionId)
  return positiveId(exam) && positiveId(id) ? (
    <Detail key={`${exam}:${id}`} examId={exam} id={id} />
  ) : (
    <p role="alert">El examen o la infracción solicitados no son válidos.</p>
  )
}
