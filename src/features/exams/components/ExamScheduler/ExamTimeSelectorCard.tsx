import styles from './ExamTimeSelectorCard.module.css'

export interface ExamTimeSelectorCardProps {
  startTime: string
  endTimeFormatted: string
  disabled: boolean
  onStartTimeChange: (time: string) => void
}

const ACADEMIC_TIME_SLOTS = [
  '08:15',
  '09:45',
  '11:15',
  '14:15',
  '15:45',
  '17:15',
] as const

export function ExamTimeSelectorCard({
  startTime,
  endTimeFormatted,
  disabled,
  onStartTimeChange,
}: ExamTimeSelectorCardProps) {
  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeaderRow}>
        <h3>Horario de inicio</h3>
        <span className={styles.timeWindowBadge}>
          {startTime} – {endTimeFormatted}
        </span>
      </div>

      <div
        className={styles.timePresetsGrid}
        role="group"
        aria-label="Turnos académicos frecuentes"
      >
        {ACADEMIC_TIME_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            className={`${styles.timePresetBtn} ${
              startTime === slot ? styles.timePresetBtnActive : ''
            }`}
            onClick={() => onStartTimeChange(slot)}
          >
            {slot}
          </button>
        ))}
      </div>

      <div className={styles.customTimeRow}>
        <label htmlFor="exam-custom-start-time">
          Hora personalizada de inicio:
        </label>
        <input
          id="exam-custom-start-time"
          type="time"
          value={startTime}
          disabled={disabled}
          className={styles.customTimeInput}
          onChange={(event) => {
            if (event.target.value) {
              onStartTimeChange(event.target.value)
            }
          }}
        />
      </div>
    </div>
  )
}