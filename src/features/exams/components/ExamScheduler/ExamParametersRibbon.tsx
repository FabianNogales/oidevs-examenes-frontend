import { MAX_ALLOWED_PARTIAL_NUMBER } from '../../utils/examScheduleFormatters'
import type { EvaluationType } from '../../types/exam.types'
import styles from './ExamParametersRibbon.module.css'

export interface ExamParametersRibbonProps {
  partialNumber: string
  evaluationType: EvaluationType
  hours: number
  minutes: number
  lastCreatedPartialNumber?: number
  disabled: boolean
  onPartialNumberChange: (partialNumber: string) => void
  onEvaluationTypeChange: (evaluationType: EvaluationType) => void
  onDurationChange: (hours: number, minutes: number) => void
}

const QUICK_PARTIAL_OPTIONS = ['1', '2'] as const

const EVALUATION_TYPE_OPTIONS: ReadonlyArray<{
  value: EvaluationType
  label: string
}> = [
  { value: 'partial', label: 'Parcial' },
  { value: 'final', label: 'Final' },
  { value: 'makeup', label: 'Instancia' },
]

const DURATION_PRESETS = [
  { label: '30 min', hours: 0, minutes: 30 },
  { label: '1 hora', hours: 1, minutes: 0 },
  { label: '1:30', hours: 1, minutes: 30 },
] as const

interface DurationWheelInputProps {
  value: string
  unitLabel: string
  ariaLabel: string
  incrementLabel: string
  decrementLabel: string
  disabled: boolean
  onInputChange: (rawValue: string) => void
  onIncrement: () => void
  onDecrement: () => void
}

function DurationWheelInput({
  value,
  unitLabel,
  ariaLabel,
  incrementLabel,
  decrementLabel,
  disabled,
  onInputChange,
  onIncrement,
  onDecrement,
}: DurationWheelInputProps) {
  return (
    <div className={styles.timeWheelGroup}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        className={styles.wheelNumberInput}
        onChange={(event) => onInputChange(event.target.value)}
      />
      <span className={styles.wheelUnitLabel}>{unitLabel}</span>
      <div className={styles.wheelButtonsCol}>
        <button
          type="button"
          disabled={disabled}
          className={styles.wheelStepBtn}
          onClick={onIncrement}
          aria-label={incrementLabel}
        >
          ▲
        </button>
        <button
          type="button"
          disabled={disabled}
          className={styles.wheelStepBtn}
          onClick={onDecrement}
          aria-label={decrementLabel}
        >
          ▼
        </button>
      </div>
    </div>
  )
}

function ParseDigitsToNumber(rawValue: string): number {
  const digitsOnly = rawValue.replace(/\D/g, '')
  return digitsOnly === '' ? 0 : Number(digitsOnly)
}

export function ExamParametersRibbon({
  partialNumber,
  evaluationType,
  hours,
  minutes,
  lastCreatedPartialNumber = 0,
  disabled,
  onPartialNumberChange,
  onEvaluationTypeChange,
  onDurationChange,
}: ExamParametersRibbonProps) {
  const isPartialEvaluation = evaluationType === 'partial'
  const totalMinutes = Math.max(5, hours * 60 + minutes)
  const isCustomPartialNumber =
    partialNumber !== '1' && partialNumber !== '2' && partialNumber !== ''

  const HandleNumericPartialInput = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '')
    if (digitsOnly === '') {
      onPartialNumberChange('')
      return
    }
    const numericValue = Number(digitsOnly.slice(-1))
    if (numericValue >= 1 && numericValue <= MAX_ALLOWED_PARTIAL_NUMBER) {
      onPartialNumberChange(String(numericValue))
    }
  }

  return (
    <section
      className={styles.parametersRibbon}
      aria-label="Parámetros principales de la evaluación"
    >
      <div
        className={`${styles.parameterBlock} ${
          !isPartialEvaluation ? styles.parameterBlockDisabled : ''
        }`}
      >
        <div className={styles.parameterLabelRow}>
          <span className={styles.parameterLabel}>Número de parcial</span>
          <span className={styles.parameterHint}>
            {isPartialEvaluation
              ? lastCreatedPartialNumber > 0
                ? `Último creado: ${lastCreatedPartialNumber}º • Máx. 6`
                : `${partialNumber || '1'}º Parcial (Máx. 6)`
              : 'No aplica'}
          </span>
        </div>

        <div
          className={styles.partialTrackWithCustom}
          role="group"
          aria-label="Número de parcial"
        >
          {QUICK_PARTIAL_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled || !isPartialEvaluation}
              className={`${styles.segmentedBtn} ${
                partialNumber === option ? styles.segmentedBtnActive : ''
              }`}
              onClick={() => onPartialNumberChange(option)}
            >
              {option}
            </button>
          ))}

          <div className={styles.customPartialInputWrap}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[1-6]"
              maxLength={1}
              placeholder="3 al 6"
              aria-label="Ingresar número de parcial del 3 al 6"
              disabled={disabled || !isPartialEvaluation}
              value={isCustomPartialNumber ? partialNumber : ''}
              className={`${styles.customPartialInput} ${
                isCustomPartialNumber ? styles.customPartialInputActive : ''
              }`}
              onChange={(event) => HandleNumericPartialInput(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.parameterBlock}>
        <div className={styles.parameterLabelRow}>
          <span className={styles.parameterLabel}>Tipo de examen</span>
          <span className={styles.parameterHint}>Modalidad</span>
        </div>
        <div
          className={styles.segmentedTrack}
          role="group"
          aria-label="Tipo de examen"
        >
          {EVALUATION_TYPE_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              className={`${styles.segmentedBtn} ${
                evaluationType === item.value ? styles.segmentedBtnActive : ''
              }`}
              onClick={() => onEvaluationTypeChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.parameterBlock}>
        <div className={styles.parameterLabelRow}>
          <span className={styles.parameterLabel}>Duración del examen</span>
          <span className={styles.parameterHint}>{totalMinutes} min</span>
        </div>

        <div className={styles.durationRow}>
          <div className={styles.digitalDurationBox}>
            <DurationWheelInput
              value={String(hours)}
              unitLabel="h"
              ariaLabel="Horas de duración"
              incrementLabel="Incrementar horas"
              decrementLabel="Disminuir horas"
              disabled={disabled}
              onInputChange={(raw) =>
                onDurationChange(ParseDigitsToNumber(raw), minutes)
              }
              onIncrement={() => onDurationChange(hours + 1, minutes)}
              onDecrement={() => onDurationChange(hours - 1, minutes)}
            />

            <span className={styles.durationColon}>:</span>

            <DurationWheelInput
              value={String(minutes).padStart(2, '0')}
              unitLabel="m"
              ariaLabel="Minutos de duración"
              incrementLabel="Incrementar minutos"
              decrementLabel="Disminuir minutos"
              disabled={disabled}
              onInputChange={(raw) =>
                onDurationChange(hours, ParseDigitsToNumber(raw))
              }
              onIncrement={() =>
                onDurationChange(hours, minutes + 5 > 59 ? 0 : minutes + 5)
              }
              onDecrement={() =>
                onDurationChange(hours, minutes - 5 < 0 ? 55 : minutes - 5)
              }
            />
          </div>

          <div className={styles.durationPresetList}>
            {DURATION_PRESETS.map((preset) => {
              const isPresetSelected =
                hours === preset.hours && minutes === preset.minutes
              return (
                <button
                  key={preset.label}
                  type="button"
                  disabled={disabled}
                  className={`${styles.durationPresetChip} ${
                    isPresetSelected ? styles.durationPresetChipActive : ''
                  }`}
                  onClick={() => onDurationChange(preset.hours, preset.minutes)}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}