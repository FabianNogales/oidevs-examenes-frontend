import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { IncidentDetails } from '../components/IncidentDetails'
import { useIncidentDetail } from '../hooks/useIncidentDetail'
import { isPositiveId } from '../utils/incidentValidation'
import styles from './Incidents.module.css'
import { incidentConsultationSearch } from '../utils/incidentConsultationNavigation'

function DetailContent({
  examId,
  incidentId,
}: {
  examId: number
  incidentId: number
}) {
  const detail = useIncidentDetail(examId, incidentId)
  const [params] = useSearchParams()
  const { state } = useLocation()
  const backTo = `/exams/${examId}/incidents${incidentConsultationSearch(params)}`
  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Incidencias', to: backTo },
            { label: `Incidencia #${incidentId}` },
          ]}
        />
        <header className={styles.heading}>
          <h1>Detalle de incidencia</h1>
          <p>Consulta la información conservada para este examen.</p>
        </header>
        {detail.loading ? (
          <p role="status">Consultando incidencia…</p>
        ) : detail.error ? (
          <section className={styles.note} role="alert">
            <p>{detail.error}</p>
            <button type="button" onClick={detail.retry}>
              Reintentar
            </button>
          </section>
        ) : detail.incident ? (
          <>
            {state?.createdIncidentId === incidentId ? (
              <p className={styles.note} role="status">
                Incidencia registrada correctamente. El servidor confirmó el
                registro #{incidentId}.
              </p>
            ) : null}
            <IncidentDetails incident={detail.incident} />
          </>
        ) : null}
        <div className={styles.access}>
          <Link to={backTo}>Volver a incidencias</Link>
        </div>
      </section>
    </main>
  )
}

export function IncidentDetailPage() {
  const params = useParams()
  const examId = Number(params.examId)
  const incidentId = Number(params.incidentId)
  if (!isPositiveId(examId) || !isPositiveId(incidentId))
    return (
      <main className={styles.page}>
        <h1>Detalle de incidencia</h1>
        <p role="alert">
          El identificador del examen o de la incidencia no es válido.
        </p>
      </main>
    )
  return (
    <DetailContent
      key={`${examId}:${incidentId}`}
      examId={examId}
      incidentId={incidentId}
    />
  )
}
