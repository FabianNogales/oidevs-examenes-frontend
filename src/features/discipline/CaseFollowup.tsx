import { useCallback, useState } from 'react'
import { getInfraction } from '@/features/infractions/api/infractionsApi'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import { InfractionStatusForm } from '@/features/infractions/components/InfractionStatusForm'
import { InfractionAuditTrail } from '@/features/infractions/components/InfractionAuditTrail'
import { StudentInfractionHistory } from '@/features/infractions/components/StudentInfractionHistory'
import { StudentExpulsionHistory } from '@/features/expulsions/components/StudentExpulsionHistory'
import { Button } from '@/shared/components/ui/Button/Button'
import type { DisciplineCase } from './disciplineApi'
export function CaseFollowup({
  record,
  onRefresh,
}: {
  record: DisciplineCase
  onRefresh: () => void
}) {
  const resource = useInfractionResource(
    `case-followup:${record.exam_id}:${record.source_id}`,
    useCallback(
      (signal) => getInfraction(record.exam_id, record.source_id, signal),
      [record.exam_id, record.source_id],
    ),
  )
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  if (resource.loading) return <p role="status">Consultando seguimiento…</p>
  if (resource.error)
    return (
      <div role="alert">
        <p>{resource.error}</p>
        <Button onClick={resource.retry}>Reintentar seguimiento</Button>
      </div>
    )
  const detail = resource.data
  if (!detail) return null
  const refresh = () => {
    setEditing(false)
    resource.retry()
    onRefresh()
  }
  return (
    <>
      {editing ? (
        <InfractionStatusForm
          detail={detail}
          onBusyChange={setBusy}
          onCancel={() => {
            if (!busy) refresh()
          }}
          onSaved={refresh}
        />
      ) : (
        detail.data.permissions.can_update &&
        detail.data.permissions.allowed_statuses.length > 0 && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Actualizar estado del caso
          </Button>
        )
      )}
      <InfractionAuditTrail events={detail.history} />
      {!busy && record.student && (
        <>
          <StudentInfractionHistory
            examId={record.exam_id}
            studentId={record.student.id}
          />
          <StudentExpulsionHistory
            examId={record.exam_id}
            studentId={record.student.id}
          />
        </>
      )}
    </>
  )
}
