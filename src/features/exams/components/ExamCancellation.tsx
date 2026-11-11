import { hasExamEnded } from '../utils/examDisplayStatus'
import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import type { ExamDetail } from '../api/examDetailsApi'
import { cancelExam } from '../api/examCancellationApi'
import { useExamNavigationGuard } from '../hooks/useExamNavigationGuard'
import { safeExamMessage } from '../utils/examMessages'
import styles from './ExamCancellation.module.css'

export function ExamCancellation({
  exam,
  onReload,
}: {
  exam: ExamDetail
  onReload: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const { notify } = useAuth()
  const guard = useExamNavigationGuard(false, busy)
  const cancelled = exam.status === 'CANCELLED'
  const permitted = exam.can_cancel === true && !cancelled
  const reasonId = useId()
  useEffect(() => () => request.current?.abort(), [])

  function close() {
    if (request.current) return
    setOpen(false)
    if (guard.blocked) guard.stay()
  }

  async function confirm() {
    if (request.current || error || !permitted) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    try {
      await cancelExam(exam, controller.signal)
      if (!controller.signal.aborted) {
        if (guard.blocked) guard.stay()
        notify(
          'success',
          'El examen fue cancelado. Su información se conserva en el historial.',
        )
        onReload()
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo confirmar la cancelación. Recarga el examen antes de reintentar.',
        )
    } finally {
      if (!controller.signal.aborted) setBusy(false)
      if (request.current === controller) request.current = null
    }
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="exam-cancellation-title"
    >
      <div>
        <h2 id="exam-cancellation-title">Cancelación del examen</h2>
        <p>
          {cancelled
            ? 'Este examen está cancelado. Su información y relaciones se conservan para consulta.'
            : 'El examen cancelado seguirá disponible en Mis exámenes → Cancelados.'}
        </p>
        {!cancelled && !permitted ? (
          <p id={reasonId} className={styles.blockReason}>
            {hasExamEnded(exam) &&
            ['SCHEDULED', 'ACTIVE', 'IN_PROGRESS'].includes(exam.status)
              ? 'El horario de este examen ya terminó. Se conserva para consulta y no se puede cancelar.'
              : exam.status === 'IN_PROGRESS'
                ? 'Este examen ya está en curso y no se puede cancelar.'
                : safeExamMessage(
                    exam.cancel_block_reason,
                    'La cancelación no está habilitada para este examen.',
                  )}
          </p>
        ) : null}
      </div>
      {!cancelled ? (
        <button
          type="button"
          className={styles.danger}
          disabled={!permitted}
          aria-describedby={!permitted ? reasonId : undefined}
          onClick={() => setOpen(true)}
        >
          Cancelar examen
        </button>
      ) : null}
      {open ? (
        <CollaborationModal title="Cancelar examen" busy={busy} onClose={close}>
          <div className={styles.confirmation}>
            <p>
              ¿Deseas cancelar <strong>{exam.name}</strong>?
            </p>
            <p>
              El examen quedará cancelado. Su información, materia, oferta
              académica y ambiente se conservarán en el historial.
            </p>
            {guard.blocked ? (
              <p role="status">
                Espera a que termine la cancelación antes de salir.
              </p>
            ) : null}
            {error ? (
              <div className={styles.error} role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (guard.blocked) guard.stay()
                    onReload()
                  }}
                >
                  Recargar examen
                </button>
              </div>
            ) : null}
            <div className={styles.actions}>
              <button type="button" onClick={close} disabled={busy}>
                Volver al detalle
              </button>
              <button
                type="button"
                className={styles.danger}
                disabled={busy || Boolean(error)}
                onClick={() => void confirm()}
              >
                {busy ? 'Cancelando…' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </CollaborationModal>
      ) : null}
    </section>
  )
}
