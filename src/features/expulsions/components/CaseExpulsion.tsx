import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/shared/components/ui/Button/Button'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import type { Infraction } from '@/features/infractions/types/infraction.types'
import {
  getExpulsionHistory,
  getRelatedInfractions,
  getExpulsions,
} from '../api/expulsionsApi'
import { ExpulsionForm } from './ExpulsionForm'
import styles from '@/features/incidents/pages/Incidents.module.css'

export function CaseExpulsion({
  record,
  refresh,
  initialOpen = false,
  onBusyChange,
}: {
  record: Infraction
  refresh: () => void
  initialOpen?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const [open, setOpen] = useState(initialOpen)
  const [busy, setBusy] = useState(false)
  const reportBusy = useCallback(
    (value: boolean) => {
      setBusy(value)
      onBusyChange?.(value)
    },
    [onBusyChange],
  )
  const load = useCallback(
    async (signal: AbortSignal) => {
      const history = await getExpulsionHistory(
        record.exam_id,
        record.student.id,
        1,
        signal,
      )
      const entries = [...history.data]
      for (let page = 2; page <= history.meta.last_page; page++) {
        entries.push(
          ...(
            await getExpulsionHistory(
              record.exam_id,
              record.student.id,
              page,
              signal,
            )
          ).data,
        )
      }
      const existing = entries.find(
        (item) => item.expulsion.exam_id === record.exam_id,
      )
      if (existing) return { existing: existing.expulsion, eligible: null }
      const permission = await getExpulsions(record.exam_id, 1, signal)
      if (!permission.permissions.can_create)
        return { existing: null, eligible: null }
      const first = await getRelatedInfractions(
        record.exam_id,
        record.student.id,
        1,
        signal,
      )
      const candidates = [...first.data]
      for (let page = 2; page <= first.meta.last_page; page++) {
        candidates.push(
          ...(
            await getRelatedInfractions(
              record.exam_id,
              record.student.id,
              page,
              signal,
            )
          ).data,
        )
      }
      return {
        existing: null,
        eligible: candidates.find((item) => item.id === record.id) ?? null,
      }
    },
    [record.exam_id, record.student.id, record.id],
  )
  const query = useInfractionResource(
    `case-measure:${record.exam_id}:${record.id}`,
    load,
  )
  const existing = query.data?.existing
  const eligible = query.data?.eligible
  const close = () => {
    if (!busy) {
      setOpen(false)
      query.retry()
      refresh()
    }
  }
  return (
    <section className={styles.note} aria-label="Medida del caso">
      <h2>Medida del caso</h2>
      {query.loading ? (
        <p role="status">Consultando la medida y la autorización…</p>
      ) : query.error ? (
        <div role="alert">
          <p>{query.error}</p>
          <Button variant="secondary" onClick={query.retry}>
            Reintentar consulta
          </Button>
        </div>
      ) : existing ? (
        <>
          <p>
            <strong>Expulsado del examen</strong> · {existing.expelled_by.name}
          </p>
          <p>{formatIncidentDate(existing.expelled_at)}</p>
          <p>{existing.reason}</p>
          {existing.infraction?.id !== record.id && (
            <p>La expulsión está registrada en otro caso de este examen.</p>
          )}
          <Link
            to={`/teacher/exams/${record.exam_id}/expulsions/${existing.id}`}
          >
            Ver medida e historial
          </Link>
        </>
      ) : eligible ? (
        <Button variant="danger" onClick={() => setOpen(true)}>
          Expulsar del examen
        </Button>
      ) : (
        <p>
          No hay una expulsión registrada para este estudiante en el examen. La
          acción requiere autorización vigente.
        </p>
      )}
      {open && eligible && (
        <PortalDialog title="Expulsar del examen" busy={busy} onClose={close}>
          <ExpulsionForm
            examId={record.exam_id}
            caseRecord={{ student: record.student, infraction: eligible }}
            onBusyChange={reportBusy}
            onCancel={close}
            onSaved={close}
          />
        </PortalDialog>
      )}
    </section>
  )
}
