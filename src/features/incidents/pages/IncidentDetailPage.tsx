import { LegacyCaseRedirect } from '@/features/discipline/LegacyCaseRedirect'
import type { ReactNode } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { IncidentDetails } from '../components/IncidentDetails'
import { useIncidentDetail } from '../hooks/useIncidentDetail'
import { isPositiveId } from '../utils/incidentValidation'
import styles from './Incidents.module.css'
import { incidentConsultationListPath } from '../utils/incidentConsultationNavigation'

// U3.4b: header and container come from PageHeader/PageContainer (Incidents.module.css unchanged).
const titleId = 'incident-detail-title'

// The admin route renders inside AdminLayout, which already provides the page's main landmark.
function PageLandmark({ children }: { children: ReactNode }) {
  const admin = useLocation().pathname?.startsWith('/admin/') === true
  return admin ? children : <main>{children}</main>
}

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
  const backTo = incidentConsultationListPath(examId, params)
  return (
    <PageLandmark>
      <PageContainer labelledBy={titleId}>
        <PageHeader
          title="Detalle de incidencia"
          titleId={titleId}
          description="Consulta la información conservada para este examen."
          breadcrumbs={[
            { label: 'Incidencias', to: backTo },
            { label: `Incidencia #${incidentId}` },
          ]}
        />
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
      </PageContainer>
    </PageLandmark>
  )
}

export function IncidentDetailPage() {
  const params = useParams()
  const location = useLocation()
  if (!location.pathname.startsWith('/admin/'))
    return <LegacyCaseRedirect source="INCIDENT" param="incidentId" />
  const examId = Number(params.examId)
  const incidentId = Number(params.incidentId)
  if (!isPositiveId(examId) || !isPositiveId(incidentId))
    return (
      <PageLandmark>
        <PageContainer labelledBy={titleId}>
          <PageHeader title="Detalle de incidencia" titleId={titleId} />
          <p role="alert">
            El identificador del examen o de la incidencia no es válido.
          </p>
        </PageContainer>
      </PageLandmark>
    )
  return (
    <DetailContent
      key={`${examId}:${incidentId}`}
      examId={examId}
      incidentId={incidentId}
    />
  )
}
