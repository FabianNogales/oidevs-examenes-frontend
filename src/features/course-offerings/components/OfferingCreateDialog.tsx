import { useRef, useState } from 'react'
import { OfferingModal } from './OfferingModal'
import { OfferingPeriodScope } from './OfferingPeriodScope'
import { OfferingManualForm } from './OfferingManualForm'

export function OfferingCreateDialog({
  teacherId,
  onClose,
  onSaved,
  onBusy,
}: {
  teacherId?: number
  onClose: () => void
  onSaved: (count: number) => void
  onBusy: (value: boolean) => void
}) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  function changeBusy(value: boolean) {
    pending.current = value
    setBusy(value)
    onBusy(value)
  }
  function close() {
    if (!pending.current) onClose()
  }
  return (
    <OfferingModal
      title="Asignar materias a un docente"
      busy={busy}
      onClose={close}
    >
      <OfferingPeriodScope>
        {(term) => (
          <OfferingManualForm
            key={term.id}
            termId={term.id}
            teacherId={teacherId}
            onBusy={changeBusy}
            onSaved={onSaved}
            onCancel={close}
          />
        )}
      </OfferingPeriodScope>
    </OfferingModal>
  )
}
