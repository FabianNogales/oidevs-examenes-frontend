import { useState } from 'react'
import { createPortal } from 'react-dom'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { IncidentForm } from './IncidentForm'
import { IncidentDetails } from './IncidentDetails'
import { useIncidents } from '../hooks/useIncidents'
import { useIncidentDetail } from '../hooks/useIncidentDetail'
import type { Incident } from '../types/incident.types'
import type { IncidentEntryContext } from '../utils/incidentEntryContext'
import styles from './IncidentControlDialog.module.css'

export type IncidentControlMode =
  { context: IncidentEntryContext } | { incidentId: number }

function ExistingIncident({
  examId,
  incidentId,
}: {
  examId: number
  incidentId: number
}) {
  const detail = useIncidentDetail(examId, incidentId)
  return detail.loading ? (
    <p role="status">Consultando incidencia…</p>
  ) : detail.error ? (
    <div role="alert">
      <p>{detail.error}</p>
      <button type="button" onClick={detail.retry}>
        Reintentar
      </button>
    </div>
  ) : detail.incident ? (
    <IncidentDetails incident={detail.incident} />
  ) : null
}

function RegisterFromControl({
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
  const authorization = useIncidents(examId)
  const [saved, setSaved] = useState<Incident | null>(null)
  if (saved)
    return (
      <>
        <p role="status">
          Incidencia #{saved.id} registrada. Puedes continuar con el control de
          ingreso.
        </p>
        <IncidentDetails incident={saved} />
      </>
    )
  if (authorization.loading)
    return <p role="status">Comprobando autorización vigente…</p>
  if (authorization.error)
    return (
      <div role="alert">
        <p>{authorization.error}</p>
        <button type="button" onClick={authorization.retry}>
          Reintentar
        </button>
      </div>
    )
  const data = authorization.response
  if (!data?.permissions.can_create)
    return (
      <p role="alert">
        No tienes autorización vigente para registrar incidencias en este
        examen.
      </p>
    )
  return (
    <>
      <p>
        <strong>{data.exam.name}</strong> · {data.exam.subject_name}
      </p>
      <IncidentForm
        examId={examId}
        backTo={`/exams/${examId}/incidents`}
        initialStudent={context.student}
        initialType={context.type}
        onCreated={setSaved}
        onCancel={onClose}
        onBusyChange={onBusyChange}
      />
    </>
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
  return createPortal(
    <div className={styles.layer}>
      <CollaborationModal
        title={
          'incidentId' in mode
            ? 'Detalle de incidencia'
            : 'Registrar incidencia'
        }
        busy={busy}
        onClose={() => {
          if (!busy) onClose()
        }}
      >
        {'incidentId' in mode ? (
          <ExistingIncident examId={examId} incidentId={mode.incidentId} />
        ) : (
          <RegisterFromControl
            examId={examId}
            context={mode.context}
            onClose={onClose}
            onBusyChange={setBusy}
          />
        )}
      </CollaborationModal>
    </div>,
    document.body,
  )
}
