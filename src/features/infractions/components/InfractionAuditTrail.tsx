import type { InfractionAudit } from '../types/infraction.types'
import { INFRACTION_STATUS_LABELS } from '../utils/infractionValidation'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import styles from './InfractionManagement.module.css'

export function InfractionAuditTrail({
  events,
}: {
  events: InfractionAudit[]
}) {
  return (
    <section className={styles.section} aria-label="Historial de seguimiento">
      <h2>Historial de seguimiento</h2>
      <ol className={styles.audit}>
        {events.map((event) => (
          <li key={event.id}>
            <strong>
              {event.action === 'CREATED'
                ? 'Registro inicial'
                : event.action === 'STATUS_CHANGED'
                  ? 'Cambio de estado'
                  : 'Actualización autorizada'}
            </strong>
            <p>
              {event.from_status &&
                `${INFRACTION_STATUS_LABELS[event.from_status]} → `}
              {INFRACTION_STATUS_LABELS[event.to_status]}
            </p>
            <p>
              {event.performed_by.name} ·{' '}
              <time dateTime={event.performed_at}>
                {formatIncidentDate(event.performed_at)}
              </time>
            </p>
            {event.reason && <p className={styles.text}>{event.reason}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}
