import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import { Button } from '@/shared/components/ui/Button/Button'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import { CaseForm } from '@/features/discipline/CaseForm'
import { CaseDetails } from '@/features/discipline/CaseDetails'
import {
  listCases,
  resolveCase,
  type CaseDetail,
} from '@/features/discipline/disciplineApi'
import type { IncidentEntryContext } from '../utils/incidentEntryContext'
export type IncidentControlMode =
  { context: IncidentEntryContext } | { incidentId: number }
function Existing({
  examId,
  id,
  onBusyChange,
}: {
  examId: number
  id: number
  onBusyChange: (busy: boolean) => void
}) {
  const source = String(id).startsWith('qr-') ? 'QR' : 'INCIDENT'
  const sourceId = Number(String(id).replace(/^qr-/, ''))
  const query = useInfractionResource(
    `case-reference:${examId}:${id}`,
    useCallback(
      (signal) => resolveCase(examId, source, sourceId, signal),
      [examId, source, sourceId],
    ),
  )
  return query.loading ? (
    <p role="status">Consultando caso…</p>
  ) : query.error ? (
    <div role="alert">
      <p>{query.error}</p>
      <Button onClick={query.retry}>Reintentar</Button>
    </div>
  ) : (
    query.data && (
      <>
        <CaseDetails
          record={query.data.data}
          onRefresh={query.retry}
          onBusyChange={onBusyChange}
        />
        <Link to={`/exams/${examId}/cases/${query.data.data.id}`}>
          Ver caso y seguimiento
        </Link>
      </>
    )
  )
}
function Register({
  examId,
  context,
  onClose,
  onBusyChange,
}: {
  examId: number
  context: IncidentEntryContext
  onClose: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const query = useInfractionResource(
    `case-control:${examId}`,
    useCallback(
      (signal) => listCases(examId, { per_page: 1 }, signal),
      [examId],
    ),
  )
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [saved, setSaved] = useState<CaseDetail | null>(null)
  if (saved)
    return (
      <>
        {refreshError && <p role="alert">{refreshError}</p>}
        <p role="status">Caso #{saved.data.id} registrado.</p>
        <CaseDetails
          record={saved.data}
          onRefresh={() => {
            void resolveCase(
              examId,
              saved.data.source_type,
              saved.data.source_id,
            )
              .then((result) => {
                setSaved(result)
                setRefreshError(null)
              })
              .catch(() =>
                setRefreshError(
                  'No se pudo actualizar el caso. Abre su detalle para consultar el estado vigente.',
                ),
              )
          }}
          onBusyChange={onBusyChange}
        />
        <Link to={`/exams/${examId}/cases/${saved.data.id}`}>
          Ver caso y seguimiento
        </Link>
      </>
    )
  return query.loading ? (
    <p role="status">Comprobando autorización…</p>
  ) : query.error ? (
    <div role="alert">
      <p>{query.error}</p>
      <Button onClick={query.retry}>Reintentar</Button>
    </div>
  ) : query.data?.permissions.can_create ? (
    <CaseForm
      context={query.data}
      initialStudent={context.student}
      initialType={context.type}
      onSaved={setSaved}
      onCancel={onClose}
      onBusyChange={onBusyChange}
    />
  ) : (
    <p role="alert">No tienes autorización vigente para registrar casos.</p>
  )
}
export function IncidentControlDialog({
  examId,
  mode,
  onClose,
}: {
  examId: number
  mode: IncidentControlMode
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <PortalDialog
      title={
        'incidentId' in mode
          ? 'Detalle del caso'
          : 'Registrar incidencia o infracción'
      }
      busy={busy}
      onClose={onClose}
    >
      {'incidentId' in mode ? (
        <Existing examId={examId} id={mode.incidentId} onBusyChange={setBusy} />
      ) : (
        <Register
          examId={examId}
          context={mode.context}
          onClose={onClose}
          onBusyChange={setBusy}
        />
      )}
    </PortalDialog>
  )
}
