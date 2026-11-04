import type { Incident } from '../types/incident.types'
import { INCIDENT_TYPE_LABELS } from '../utils/incidentValidation'
import {
  formatIncidentDate,
  incidentStatusLabel,
} from '../utils/incidentDisplay'
import styles from './IncidentDetails.module.css'

export function IncidentDetails({ incident }: { incident: Incident }) {
  const student = incident.student
  return (
    <article className={styles.detail} aria-label={`Incidencia ${incident.id}`}>
      <header className={styles.summary}>
        <div>
          <h2>Incidencia #{incident.id}</h2>
          <p>{INCIDENT_TYPE_LABELS[incident.type]}</p>
        </div>
        <div className={styles.badges}>
          <span>{incident.origin === 'MANUAL' ? 'Manual' : 'Automática'}</span>
          <span>{incidentStatusLabel(incident.status)}</span>
        </div>
      </header>
      <div className={styles.grid}>
        <div className={styles.sections}>
          <section className={styles.panel}>
            <h2>Descripción de lo ocurrido</h2>
            <p className={styles.description}>{incident.description}</p>
          </section>
          <section className={styles.panel}>
            <h2>Estudiante involucrado</h2>
            {student ? (
              <>
                <strong>
                  {student.first_names} {student.last_names}
                </strong>
                <dl>
                  <dt>SIS</dt>
                  <dd>{student.sis_code}</dd>
                  <dt>CI</dt>
                  <dd>{student.identity_number || 'No informado'}</dd>
                </dl>
              </>
            ) : (
              <p>
                Sin estudiante identificado o no aplica. No se asoció una
                identidad al registro.
              </p>
            )}
          </section>
        </div>
        <section className={styles.panel}>
          <h2>Datos del registro</h2>
          <dl>
            <dt>Examen</dt>
            <dd>#{incident.exam_id}</dd>
            <dt>Fecha y hora</dt>
            <dd>
              <time dateTime={incident.created_at}>
                {formatIncidentDate(incident.created_at)}
              </time>
            </dd>
            <dt>
              {incident.origin === 'MANUAL'
                ? 'Reportado por'
                : 'Responsable asociado al evento'}
            </dt>
            <dd>{incident.reported_by.name}</dd>
            <dt>Origen</dt>
            <dd>
              {incident.origin === 'MANUAL'
                ? 'Reporte manual'
                : 'Evento automático del control de ingreso'}
            </dd>
          </dl>
          {incident.origin === 'AUTOMATIC' ? (
            <p>
              Se consulta el evento conservado por el servidor; abrir este
              detalle no crea otro reporte.
            </p>
          ) : null}
        </section>
      </div>
      <p className={styles.notice}>
        Esta incidencia documenta un acontecimiento. No confirma una infracción
        ni aplica una sanción; tampoco modifica la asistencia o habilitación del
        estudiante.
      </p>
    </article>
  )
}
