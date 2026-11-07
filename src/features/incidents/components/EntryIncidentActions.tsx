import type { EntryProcessingResponse } from '@/features/exams/types/entryRegistration.types'
import {
  entryIncidentContext,
  persistedEntryIncident,
} from '../utils/incidentEntryContext'
import type { IncidentEntryContext } from '../utils/incidentEntryContext'
import styles from '../pages/Incidents.module.css'

export function EntryIncidentActions({
  response,
  examId,
  disabled,
  onReport,
  onView,
}: {
  response: EntryProcessingResponse
  examId: number
  disabled: boolean
  onReport: (context: IncidentEntryContext) => void
  onView: (incidentId: number) => void
}) {
  const incidentId = persistedEntryIncident(response, examId)
  if (incidentId !== null)
    return (
      <div className={styles.access}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onView(incidentId)}
        >
          Ver incidencia del evento
        </button>
      </div>
    )
  // HU14 already audits wrong-exam attempts. No second manual POST for that event.
  if (response.result === 'WRONG_EXAM')
    return (
      <p className={styles.note}>
        El QR corresponde a otro examen. El servidor no devolvió una referencia
        de incidencia consultable; revisa las incidencias del examen antes de
        reportar el mismo evento.
      </p>
    )
  return (
    <div className={styles.access}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onReport(entryIncidentContext(response))}
      >
        Reportar una situación
      </button>
    </div>
  )
}
