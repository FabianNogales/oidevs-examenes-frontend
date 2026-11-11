import { useEffect, useRef } from 'react'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import { trapDialogFocus } from '@/shared/utils/trapDialogFocus'
import type { Room, RoomBusySlot } from '../../types/exam.types'
import styles from './SharedRoomConsentModal.module.css'

export interface SharedRoomConsentModalProps {
  room: Room | null
  conflictingSlots: RoomBusySlot[]
  onCancel: () => void
  onConfirmConsent: (room: Room) => void
}

export function SharedRoomConsentModal({
  room,
  conflictingSlots,
  onCancel,
  onConfirmConsent,
}: SharedRoomConsentModalProps) {
  // G7: keyboard and focus behaviour only; the approved look of this dialog is unchanged.
  const isOpen = room !== null
  const cancelButton = useRef<HTMLButtonElement>(null)
  useBodyScrollLock(isOpen)
  useEffect(() => {
    if (!isOpen) return
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    // The safe choice receives the initial focus.
    cancelButton.current?.focus()
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [isOpen])

  if (!room) return null

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-room-consent-title"
      // The backdrop is not focusable: a press on it would move focus to <body>, outside the Tab trap.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) event.preventDefault()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onCancel()
          return
        }
        trapDialogFocus(event)
      }}
    >
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <span className={styles.warningBadge}>
              Confirmación de aula compartida
            </span>
            <h3 id="shared-room-consent-title">
              Este ambiente no está configurado como compartido
            </h3>
          </div>
        </div>

        <div className={styles.modalBody}>
          <p>
            El ambiente <strong>{room.name || room.code}</strong> tiene una
            evaluación programada en este bloque horario que no fue marcada
            inicialmente como aula compartida.
          </p>

          <div className={styles.conflictSummaryBox}>
            <span className={styles.conflictRoomTitle}>
              {room.name || room.code} ({room.capacity ?? 0} plazas)
            </span>
            {conflictingSlots.map((slot, index) => (
              <span
                key={`${slot.start}-${index}`}
                className={styles.conflictSlotItem}
              >
                • Reserva detectada: {slot.start} – {slot.end}
                {slot.exam_name ? ` (${slot.exam_name})` : ''}
              </span>
            ))}
          </div>

          <p>
            ¿Das tu consentimiento para compartir este ambiente y habilitar su
            selección bajo modalidad de examen compartido?
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button
            ref={cancelButton}
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.confirmConsentBtn}
            onClick={() => onConfirmConsent(room)}
          >
            Dar consentimiento y seleccionar aula
          </button>
        </div>
      </div>
    </div>
  )
}