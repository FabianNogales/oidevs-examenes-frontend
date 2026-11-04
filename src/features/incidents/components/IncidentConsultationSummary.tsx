import type { IncidentConsultationPage } from '../types/incidentConsultation.types'
import type { IncidentType } from '../types/incident.types'
import { INCIDENT_TYPE_LABELS } from '../utils/incidentValidation'
import styles from './IncidentConsultation.module.css'

export function IncidentConsultationSummary({
  summary,
}: {
  summary: IncidentConsultationPage['summary']
}) {
  return (
    <section className={styles.summary} aria-label="Resumen de la consulta">
      <h2>
        Resumen de la consulta <span>{summary.total} incidencias</span>
      </h2>
      <dl>
        {(Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[]).map((type) => (
          <div key={type}>
            <dt>{INCIDENT_TYPE_LABELS[type]}</dt>
            <dd>{summary.by_type[type]}</dd>
          </div>
        ))}
      </dl>
      <p>
        Totales de todos los registros que coinciden con los filtros, incluidas
        las demás páginas.
      </p>
    </section>
  )
}
