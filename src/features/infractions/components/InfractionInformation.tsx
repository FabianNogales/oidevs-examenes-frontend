import type { InfractionDetail } from '../types/infraction.types'
import {
  INFRACTION_STATUS_LABELS,
  INFRACTION_TYPE_LABELS,
} from '../utils/infractionValidation'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import styles from '@/features/incidents/components/IncidentDetails.module.css'

export function InfractionInformation({
  detail,
}: {
  detail: InfractionDetail
}) {
  const record = detail.data
  return (
    <article className={styles.detail} aria-label={`Infracción ${record.id}`}>
      <header className={styles.summary}>
        <div>
          <h2>Infracción #{record.id}</h2>
          <p>{INFRACTION_TYPE_LABELS[record.type]}</p>
        </div>
        <div className={styles.badges}>
          <span>{INFRACTION_STATUS_LABELS[record.status]}</span>
        </div>
      </header>
      <div className={styles.grid}>
        <div className={styles.sections}>
          <section className={styles.panel}>
            <h2>Descripción de los hechos</h2>
            <p className={styles.description}>{record.description}</p>
          </section>
          <section className={styles.panel}>
            <h2>Observaciones adicionales</h2>
            <p className={styles.description}>
              {record.observations || 'Sin observaciones adicionales.'}
            </p>
          </section>
          <section className={styles.panel}>
            <h2>Estudiante involucrado</h2>
            <strong>
              {record.student.first_names} {record.student.last_names}
            </strong>
            <dl>
              <dt>SIS</dt>
              <dd>{record.student.sis_code}</dd>
              <dt>CI</dt>
              <dd>{record.student.identity_number || 'No informado'}</dd>
            </dl>
          </section>
        </div>
        <section className={styles.panel}>
          <h2>Datos del registro</h2>
          <dl>
            <dt>Examen</dt>
            <dd>
              {detail.exam.name} · {detail.exam.subject_name}
            </dd>
            <dt>Registrada por</dt>
            <dd>{record.reported_by.name}</dd>
            <dt>Fecha y hora · Bolivia</dt>
            <dd>
              <time dateTime={record.occurred_at}>
                {formatIncidentDate(record.occurred_at)}
              </time>
            </dd>
            <dt>Última actualización</dt>
            <dd>
              <time dateTime={record.updated_at}>
                {formatIncidentDate(record.updated_at)}
              </time>
            </dd>
          </dl>
        </section>
      </div>
      <p className={styles.notice}>
        {record.status === 'REPORTED'
          ? 'Este registro está reportado y no constituye una infracción confirmada. '
          : ''}
        El estado no anula la asistencia ni registra una expulsión
        automáticamente.
      </p>
    </article>
  )
}
