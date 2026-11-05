import type { AnnulmentHistoryRecord } from '../types/entryAnnulment.types'
import styles from './AnnulEntryConfirmation.module.css'

export function EntryAnnulmentEvidence({
  record,
}: {
  record: AnnulmentHistoryRecord
}) {
  if (record.entry.status !== 'ANNULLED') return null
  const annulment = record.entry.annulment
  const complete =
    annulment &&
    typeof annulment.reason === 'string' &&
    annulment.reason.trim() &&
    typeof annulment.annulled_by?.name === 'string' &&
    annulment.annulled_by.name.trim() &&
    typeof annulment.annulled_at === 'string' &&
    !Number.isNaN(Date.parse(annulment.annulled_at))
  return (
    <details className={styles.evidence}>
      <summary>Detalle de anulación</summary>
      {complete ? (
        <dl>
          <div>
            <dt>Motivo</dt>
            <dd>{annulment.reason}</dd>
          </div>
          <div>
            <dt>Anulado por</dt>
            <dd>{annulment.annulled_by.name}</dd>
          </div>
          <div>
            <dt>Fecha y hora de anulación · Bolivia</dt>
            <dd>
              {new Date(annulment.annulled_at).toLocaleString('es-BO', {
                timeZone: 'America/La_Paz',
                hour12: false,
              })}
            </dd>
          </div>
        </dl>
      ) : (
        <p>
          El servidor no proporcionó el detalle de la anulación. Actualiza el
          historial.
        </p>
      )}
    </details>
  )
}
