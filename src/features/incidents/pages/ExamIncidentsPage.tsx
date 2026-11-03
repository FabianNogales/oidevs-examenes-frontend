import { Link, useParams, useSearchParams } from 'react-router'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { IncidentRecordsTable } from '../components/IncidentRecordsTable'
import { useIncidents } from '../hooks/useIncidents'
import { isPositiveId } from '../utils/incidentValidation'
import { ExamIncidentConsultation } from './ExamIncidentConsultation'
import styles from './Incidents.module.css'

// Keep the existing HU27 collaborator consultation independent of HU29 metadata.
function IncidentsContent({ examId }: { examId: number }) {
  const list = useIncidents(examId)
  const response = list.response
  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Colaborador', to: '/collaborator' },
            { label: 'Incidencias' },
          ]}
        />
        <header className={styles.heading}>
          <h1>Incidencias del examen</h1>
          {response && (
            <p>
              {response.exam.name} · {response.exam.subject_name}
            </p>
          )}
        </header>
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
          aplica una sanción. Horarios de Bolivia (UTC−4).
        </p>
      </section>
    </main>
  )
}

export function ExamIncidentsPage() {
  const { examId } = useParams()
  const [params] = useSearchParams()
  const id = Number(examId)
  if (!isPositiveId(id))
    return (
      <main className={styles.page}>
        <h1>Incidencias</h1>
        <p role="alert">El identificador del examen no es válido.</p>
      </main>
    )
  // Origin changes presentation only; every request is authorized by the server.
  return params.get('from') === 'teacher' ? (
    <ExamIncidentConsultation key={id} examId={id} />
  ) : (
    <IncidentsContent key={id} examId={id} />
  )
}
