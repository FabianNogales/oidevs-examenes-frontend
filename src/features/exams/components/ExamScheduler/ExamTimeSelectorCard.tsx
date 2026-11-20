import {
  FormatBlockCountLabel,
  FormatDurationLabel,
  GetLatestStartBlockIndex,
  MAX_RESERVATION_BLOCKS,
  ROOM_RESERVATION_BLOCKS,
  type ReservationWindow,
} from '../../utils/examScheduleFormatters'
import styles from './ExamTimeSelectorCard.module.css'

export interface ExamTimeSelectorCardProps {
  reservation: ReservationWindow
  examDurationMinutes: number
  examEndTime: string
  disabled: boolean
  onStartTimeChange: (time: string) => void
}

export function ExamTimeSelectorCard({
  reservation,
  examDurationMinutes,
  examEndTime,
  disabled,
  onStartTimeChange,
}: ExamTimeSelectorCardProps) {
  const latestStartIndex = GetLatestStartBlockIndex(reservation.blockCount)
  const coveredSet = new Set(reservation.coveredIndexes)

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeaderRow}>
        <h3>Tiempo de reserva del aula</h3>
        <span className={styles.timeWindowBadge}>
          {reservation.startTime} – {reservation.endTime} •{' '}
          {FormatBlockCountLabel(reservation.blockCount)}
        </span>
      </div>

      <div
        className={styles.timePresetsGrid}
        role="group"
        aria-label="Periodos obligatorios de reserva del aula"
      >
        {ROOM_RESERVATION_BLOCKS.map((block, index) => {
          const isStartBlock = index === reservation.startIndex
          const isCoveredContinuation = !isStartBlock && coveredSet.has(index)
          const cannotStartHere = index > latestStartIndex

          const buttonClasses = [
            styles.timePresetBtn,
            isStartBlock ? styles.timePresetBtnActive : '',
            isCoveredContinuation ? styles.timePresetBtnCovered : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={block.start}
              type="button"
              disabled={disabled || cannotStartHere}
              className={buttonClasses}
              onClick={() => onStartTimeChange(block.start)}
              aria-pressed={isStartBlock || isCoveredContinuation}
              title={
                cannotStartHere
                  ? `No disponible como inicio para ${FormatBlockCountLabel(reservation.blockCount)}`
                  : `${block.start} a ${block.end}`
              }
            >
              <span className={styles.blockStartText}>{block.start}</span>
              <span className={styles.blockEndText}>a {block.end}</span>
            </button>
          )
        })}
      </div>

      <div className={styles.reservationMetaRow}>
        <span>
          Examen:{' '}
          <strong>
            {FormatDurationLabel(examDurationMinutes)} ({reservation.startTime}–
            {examEndTime})
          </strong>
        </span>
        <span>Máx. {MAX_RESERVATION_BLOCKS} periodos (hasta 21:45)</span>
      </div>
    </div>
  )
}
