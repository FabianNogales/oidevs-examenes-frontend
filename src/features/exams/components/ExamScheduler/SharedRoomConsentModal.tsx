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
  if (!room) return null

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-room-consent-title"
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