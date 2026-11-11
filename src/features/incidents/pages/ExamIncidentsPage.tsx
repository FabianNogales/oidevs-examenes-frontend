import { Link, useParams, useSearchParams } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { IncidentRecordsTable } from '../components/IncidentRecordsTable'
import { useIncidents } from '../hooks/useIncidents'
import { isPositiveId } from '../utils/incidentValidation'
import { ExamIncidentConsultation } from './ExamIncidentConsultation'
import styles from './Incidents.module.css'

// U3.4b: header and container come from PageHeader/PageContainer (Incidents.module.css unchanged).
const titleId = 'exam-incidents-title'

// Keep the existing HU27 collaborator consultation independent of HU29 metadata.
function IncidentsContent({ examId }: { examId: number }) {
  const list = useIncidents(examId)
  const response = list.response
  return (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader
          title="Incidencias del examen"
          titleId={titleId}
          description={
            response
              ? `${response.exam.name} · ${response.exam.subject_name}`
              : undefined
          }
          breadcrumbs={[
            { label: 'Colaborador', to: '/collaborator' },
            { label: 'Incidencias' },
          ]}
        />
        <div className={styles.access}>
          {response?.permissions.can_create && (
            <Link to={'/exams/' + examId + '/incidents/create'}>
              Registrar incidencia
            </Link>
          )}
          <Link to={'/exams/' + examId + '/entry-control'}>
            Control de ingreso
          </Link>
        </div>
        <IncidentRecordsTable
          data={response?.data ?? []}
          meta={response?.meta}
          loading={list.loading}
          error={list.error}
          retry={list.retry}
          setPage={list.setPage}
          detailPath={(item) => '/exams/' + examId + '/incidents/' + item.id}
        />
        <p className={styles.note}>
          Una incidencia documenta lo ocurrido; no confirma una infracción ni
          aplica una sanción.
        </p>
      </PageContainer>
    </main>
  )
}

export function ExamIncidentsPage() {
  const { examId } = useParams()
  const [params] = useSearchParams()
  const id = Number(examId)
  if (!isPositiveId(id))
    return (
      <main>
        <PageContainer labelledBy={titleId}>
          <PageHeader title="Incidencias" titleId={titleId} />
          <p role="alert">El identificador del examen no es válido.</p>
        </PageContainer>
      </main>
    )
  // Origin changes presentation only; every request is authorized by the server.
  return params.get('from') === 'teacher' ? (
    <ExamIncidentConsultation key={id} examId={id} />
  ) : (
    <IncidentsContent key={id} examId={id} />
  )
}
