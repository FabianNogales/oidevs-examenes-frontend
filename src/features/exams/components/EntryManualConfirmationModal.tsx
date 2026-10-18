import { useEffect, useRef, useState } from 'react'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { getRequestStatus } from '@/features/auth/utils/apiErrors'
import { getEntryControlErrorMessage } from '../api/entryControlApi'
import { registerEntryManually } from '../api/entryManualApi'
import type {
  EntryControlExam,
  EntryControlStudent,
} from '../types/entryControl.types'
import type { EntryManualResponse } from '../types/entryRegistration.types'
import { entryStudentName } from '../utils/entryControlDisplay'
import { canRegisterEntryManually } from '../utils/entryManualEligibility'
import { entryUnavailableReasonMessage } from '../utils/entryAvailabilityDisplay'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from '../pages/EntryControlPage.module.css'

type Props = {
  exam: EntryControlExam
  student: EntryControlStudent
  roomId: number
  onCancel: () => void
  onResult: (response: EntryManualResponse) => void
}

export function EntryManualConfirmationModal({
  exam,
  student,
  roomId,
  onCancel,
  onResult,
}: Props) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  const eligible =
    exam.entry_available !== false && canRegisterEntryManually(student, roomId)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      request.current?.abort()
    }
  }, [])

  async function confirmEntry() {
    if (request.current || processing || error || !eligible) return
    const controller = new AbortController()
    request.current = controller
    setProcessing(true)
    try {
      const result = await registerEntryManually(
        exam.id,
        student.student_id,
        { room_id: roomId },
        controller.signal,
      )
      if (!controller.signal.aborted && mounted.current) onResult(result)
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current) {
        setError(
          getRequestStatus(cause) === 422
            ? 'Los parámetros del registro no son válidos. Vuelve al detalle y revisa el ambiente seleccionado.'
            : getEntryControlErrorMessage(
                cause,
                'No se pudo confirmar el registro. Consulta el historial antes de volver a intentarlo.',
              ),
        )
      }
    } finally {
      if (request.current === controller) request.current = null
      if (!controller.signal.aborted && mounted.current) setProcessing(false)
    }
  }

  function cancel() {
    if (!request.current) onCancel()
  }

  return (
    <div
      className={`${styles.manualModalScope} ${styles.confirmationModalScope}`}
    >
      <CollaborationModal
        title="Confirmar registro de ingreso"
        onClose={cancel}
        busy={processing}
      >
        <h3 className={styles.confirmationName}>{entryStudentName(student)}</h3>
        <dl className={styles.examDetails}>
          <div>
            <dt>SIS</dt>
            <dd>{student.sis_code}</dd>
          </div>
          <div>
            <dt>CI</dt>
            <dd>{student.identity_number || 'No informado'}</dd>
          </div>
          <div>
            <dt>Examen</dt>
            <dd>{exam.name}</dd>
          </div>
        </dl>
        <p className={styles.message}>
          Confirma que verificaste presencialmente la identidad del estudiante.
        </p>
        {!eligible ? (
          <p className={sharedStyles.error} role="alert">
            {exam.entry_available === false
              ? entryUnavailableReasonMessage(exam.entry_unavailable_reason)
              : 'El estudiante no cumple las condiciones de ingreso. Vuelve al detalle.'}
          </p>
        ) : null}
        {error ? (
          <p className={sharedStyles.error} role="alert">
            {error}
          </p>
        ) : null}
        {processing ? <p role="status">Registrando ingreso manual…</p> : null}
        <div className={`${sharedStyles.actions} ${styles.modalActions}`}>
          <button
            type="button"
            className={sharedStyles.secondaryButton}
            disabled={processing}
            onClick={cancel}
          >
            {error ? 'Volver al detalle' : 'Cancelar'}
          </button>
          <button
            type="button"
            className={sharedStyles.primaryButton}
            disabled={processing || !eligible || error !== null}
            onClick={() => void confirmEntry()}
          >
            {processing ? 'Registrando…' : 'Confirmar ingreso'}
          </button>
        </div>
      </CollaborationModal>
    </div>
  )
}
