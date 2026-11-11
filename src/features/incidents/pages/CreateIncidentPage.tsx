import { useParams, useSearchParams } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { IncidentForm } from '../components/IncidentForm'
import { useIncidents } from '../hooks/useIncidents'
import { isPositiveId } from '../utils/incidentValidation'
import styles from './Incidents.module.css'
import { incidentConsultationSearch } from '../utils/incidentConsultationNavigation'

// U3.4b: header and container come from PageHeader/PageContainer (Incidents.module.css unchanged).
const titleId = 'create-incident-title'

function CreateContent({ examId }: { examId: number }) {
  const [params] = useSearchParams()
  const list = useIncidents(examId)
  const context = list.response
  const backTo = `/exams/${examId}/incidents${incidentConsultationSearch(params)}`
  return (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader
          title="Registrar incidencia"
          titleId={titleId}
          description="Documenta una situación durante el control de ingreso."
          breadcrumbs={[
            { label: 'Incidencias', to: backTo },
            { label: 'Registrar incidencia' },
          ]}
        />
        {list.loading ? (
          <p role="status">Consultando el examen y la autorización vigente…</p>
        ) : list.error ? (
          <section role="alert" className={styles.note}>
            <p>{list.error}</p>
            <button type="button" onClick={list.retry}>
              Reintentar
            </button>
          </section>
        ) : context ? (
          <>
            <section
              className={styles.note}
              aria-label="Examen de la incidencia"
            >
              <strong>{context.exam.name}</strong>
              <span className={styles.secondary}>
                {context.exam.subject_name}
              </span>
            </section>
            {context.permissions.can_create ? (
              <IncidentForm examId={examId} backTo={backTo} />
            ) : (
              <p className={styles.note} role="alert">
                No tienes autorización vigente para registrar incidencias en
                este examen.
              </p>
            )}
          </>
        ) : null}
      </PageContainer>
    </main>
  )
}

export function CreateIncidentPage() {
  const { examId } = useParams()
  const id = Number(examId)
  if (!isPositiveId(id))
    return (
      <main>
        <PageContainer labelledBy={titleId}>
          <PageHeader title="Registrar incidencia" titleId={titleId} />
          <p role="alert">El identificador del examen no es válido.</p>
        </PageContainer>
      </main>
    )
  return <CreateContent key={id} examId={id} />
}
