import type { Room } from '../../types/exam.types'
import styles from './ExamSummaryFooter.module.css'

export interface ExamSummaryFooterProps {
  examName: string
  hours: number
  minutes: number
  selectedRooms: Room[]
  isSharedRoomEnabled: boolean
  isSelectionValid: boolean
  canSubmit?: boolean
  formattedDateLabel: string
  startTime: string
  endTimeFormatted: string
  isSubmitting: boolean
  submitLabel?: string
  submittingLabel?: string
  onCancel: () => void
}

export function ExamSummaryFooter({
  examName,
  hours,
  minutes,
  selectedRooms,
  isSharedRoomEnabled,
  isSelectionValid,
  canSubmit,
  formattedDateLabel,
  startTime,
  endTimeFormatted,
  isSubmitting,
  submitLabel = 'Confirmar Programación',
  submittingLabel = 'Programando...',
  onCancel,
}: ExamSummaryFooterProps) {
  const isActionEnabled =
    canSubmit !== undefined ? canSubmit : isSelectionValid

  const totalSelectedCapacity = selectedRooms.reduce(
    (sum, room) => sum + (Number(room.capacity) || 0),
    0,
  )

  const roomsLabel =
    selectedRooms.length === 0
      ? 'Pendiente'
      : selectedRooms.length === 1
        ? `${selectedRooms[0].name || selectedRooms[0].code} (${totalSelectedCapacity} pl.)`
        : `${selectedRooms.length} aulas (${totalSelectedCapacity} plazas tot.)`

  return (
    <footer className={styles.summaryFooterBar}>
      <div className={styles.summaryChipsList}>
        <div className={styles.summaryChip}>
          <span>Examen:</span>
          <strong>{examName}</strong>
        </div>

        <div className={styles.summaryChip}>
          <span>Duración:</span>
          <strong>
            {hours}h {String(minutes).padStart(2, '0')}m
          </strong>
        </div>

        <div
          className={`${styles.summaryChip} ${
            isSelectionValid
              ? styles.summaryChipValid
              : styles.summaryChipPending
          }`}
        >
          <span>{selectedRooms.length > 1 ? 'Aulas:' : 'Aula:'}</span>
          <strong>{roomsLabel}</strong>
        </div>

        {isSharedRoomEnabled ? (
          <div className={styles.summaryChip}>
            <span>Modalidad aula:</span>
            <strong>Compartida</strong>
          </div>
        ) : null}

        <div
          className={`${styles.summaryChip} ${
            formattedDateLabel
              ? styles.summaryChip
              : styles.summaryChipPending
          }`}
        >
          <span>Horario:</span>
          <strong>
            {formattedDateLabel
              ? `${formattedDateLabel} • ${startTime} – ${endTimeFormatted}`
              : 'Selecciona un día'}
          </strong>
        </div>
      </div>

      <div className={styles.footerActionsGroup}>
        <button
          type="button"
          className={styles.secondaryActionBtn}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>

        <button
          type="submit"
          className={styles.primaryActionBtn}
          disabled={!isActionEnabled || isSubmitting}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </footer>
  )
}