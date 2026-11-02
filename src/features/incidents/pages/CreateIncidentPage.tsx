import { useParams, useSearchParams } from 'react-router'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { IncidentForm } from '../components/IncidentForm'
import { useIncidents } from '../hooks/useIncidents'
import { isPositiveId } from '../utils/incidentValidation'
import styles from './Incidents.module.css'

function CreateContent({ examId }: { examId: number }) {
  const [params] = useSearchParams()
  const list = useIncidents(examId)
  const context = list.response
  const backTo = `/exams/${examId}/incidents${params.get('from') === 'teacher' ? '?from=teacher' : ''}`
  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Incidencias', to: backTo },
            { label: 'Registrar incidencia' },
          ]}
        />
        <header className={styles.heading}>
          <h1>Registrar incidencia</h1>
          <p>Documenta una situación durante el control de ingreso.</p>
        </header>
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
      </section>
    </main>
  )
}

export function CreateIncidentPage() {
  const { examId } = useParams()
  const id = Number(examId)
  if (!isPositiveId(id))
    return (
      <main className={styles.page}>
        <h1>Registrar incidencia</h1>
        <p role="alert">El identificador del examen no es válido.</p>
      </main>
    )
  return <CreateContent key={id} examId={id} />
}
