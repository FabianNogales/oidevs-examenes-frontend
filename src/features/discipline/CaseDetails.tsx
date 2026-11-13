import { useRef, useState } from 'react'
import { Button } from '@/shared/components/ui/Button/Button'
import { Field } from '@/shared/components/ui/Field/Field'
import { Textarea } from '@/shared/components/ui/Field/Textarea'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import { IncidentNavigationGuard } from '@/features/incidents/components/IncidentNavigationGuard'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import { caseTypeLabel, caseStatusLabel } from './caseLabels'
import { caseError, expelCase, type DisciplineCase } from './disciplineApi'
import styles from '@/features/incidents/components/IncidentDetails.module.css'
import formStyles from '@/features/incidents/components/IncidentForm.module.css'

function ExpelDialog({
  record,
  onClose,
  onSaved,
  onBusyChange,
}: {
  record: DisciplineCase
  onClose: () => void
  onSaved: () => void
  onBusyChange?: (value: boolean) => void
}) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)
  return (
    <PortalDialog title="Expulsar del examen" busy={busy} onClose={onClose}>
      <form
        className={formStyles.panel}
        onSubmit={(event) => {
          event.preventDefault()
          if (lock.current) return
          lock.current = true
          setBusy(true)
          onBusyChange?.(true)
          setError(null)
          void expelCase(record.exam_id, record.id, reason)
            .then(onSaved)
            .catch((cause) => setError(caseError(cause)))
            .finally(() => {
              lock.current = false
              setBusy(false)
              onBusyChange?.(false)
            })
        }}
      >
        <IncidentNavigationGuard busy={busy} />
        <p>
          <strong>
            {record.student?.first_names} {record.student?.last_names}
          </strong>{' '}
          · Caso #{record.id}
        </p>
        {error && <p role="alert">{error}</p>}
        <Field label="Justificación" required>
          {(control) => (
            <Textarea
              {...control}
              rows={4}
              value={reason}
              disabled={busy}
              onChange={(event) => {
                setReason(event.target.value)
                setConfirmed(false)
              }}
            />
          )}
        </Field>
        <label className={formStyles.choice}>
          <input
            type="checkbox"
            required
            checked={confirmed}
            disabled={busy}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Confirmo la expulsión de este estudiante del examen.
        </label>
        <div className={formStyles.actions}>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" type="submit" loading={busy}>
            {busy ? 'Guardando…' : 'Confirmar expulsión'}
          </Button>
        </div>
      </form>
    </PortalDialog>
  )
}
export function CaseDetails({
  record,
  onRefresh,
  onBusyChange,
}: {
  record: DisciplineCase
  onRefresh: () => void
  onBusyChange?: (value: boolean) => void
}) {
  const [expelling, setExpelling] = useState(false)
  return (
    <article className={styles.detail} aria-label={`Caso ${record.id}`}>
      <header className={styles.summary}>
        <div>
          <h2>
            Caso #{record.id} · {caseTypeLabel(record.type)}
          </h2>
          <p>{caseStatusLabel(record.status)}</p>
        </div>
      </header>
      <section className={styles.panel}>
        <h3>Lo ocurrido</h3>
        <p>{record.description}</p>
        {record.observations && <p>{record.observations}</p>}
      </section>
      <section className={styles.panel}>
        <h3>Datos del registro</h3>
        <p>
          {record.student
            ? `${record.student.first_names} ${record.student.last_names} · SIS ${record.student.sis_code}`
            : 'Sin estudiante identificado'}
        </p>
        <p>
          {record.reported_by?.name ?? 'Responsable no disponible'} ·{' '}
          {formatIncidentDate(record.occurred_at)}
        </p>
      </section>
      <section className={styles.panel}>
        <h3>Medida adoptada</h3>
        {record.measure ? (
          <>
            <p>
              <strong>Expulsado del examen</strong>
            </p>
            <p>{record.measure.reason}</p>
            <p>
              {record.measure.expelled_by.name} ·{' '}
              {formatIncidentDate(record.measure.expelled_at)}
            </p>
          </>
        ) : record.measure_applied ? (
          <p>Expulsado del examen.</p>
        ) : (
          <p>Solo registro de lo ocurrido.</p>
        )}
        {record.permissions.can_expel && (
          <Button variant="danger" onClick={() => setExpelling(true)}>
            Expulsar del examen
          </Button>
        )}
      </section>
      {expelling && (
        <ExpelDialog
          record={record}
          onClose={() => {
            setExpelling(false)
            onRefresh()
          }}
          onSaved={() => {
            setExpelling(false)
            onRefresh()
          }}
          onBusyChange={onBusyChange}
        />
      )}
    </article>
  )
}
