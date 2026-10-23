import { useId, type ReactNode, type Ref } from 'react'
import type { useAvailableRooms } from '../hooks/useAvailableRooms'
import { getLocalDate, type ExamFormValues } from '../utils/examValidation'
import styles from './CreateExamModal.module.css'

type Props = {
  values: ExamFormValues
  errors: Record<string, string>
  roomsState: Pick<
    ReturnType<typeof useAvailableRooms>,
    'rooms' | 'roomError' | 'isLoadingRooms' | 'hasSchedule'
  >
  disabled: boolean
  onChange: (field: keyof ExamFormValues, value: string) => void
  nameInputRef?: Ref<HTMLInputElement>
  children?: ReactNode
}

export function ExamFormFields({
  values,
  errors,
  roomsState,
  disabled,
  onChange,
  nameInputRef,
  children,
}: Props) {
  const prefix = useId()
  const { rooms, roomError, isLoadingRooms, hasSchedule } = roomsState
  const errorFor = (field: string) =>
    errors[field] || (field === 'room_id' ? roomError : null)
  const accessibility = (field: string) => ({
    id: `${prefix}-${field}`,
    'aria-invalid': Boolean(errorFor(field)),
    'aria-describedby': errorFor(field)
      ? `${prefix}-${field}-error`
      : undefined,
  })
  function field(
    fieldName: keyof ExamFormValues,
    label: string,
    control: ReactNode,
    full = false,
  ) {
    return (
      <div
        className={full ? styles.fieldFull : styles.fieldHalf}
        key={fieldName}
      >
        <label htmlFor={`${prefix}-${fieldName}`}>{label}</label>
        {control}
        {errorFor(fieldName) ? (
          <p
            id={`${prefix}-${fieldName}-error`}
            className={styles.inlineError}
            role="alert"
          >
            {errorFor(fieldName)}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.formGrid}>
      {field(
        'name',
        'Nombre del examen *',
        <input
          {...accessibility('name')}
          ref={nameInputRef}
          maxLength={255}
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Ej. Primer parcial"
          disabled={disabled}
        />,
        true,
      )}
      {field(
        'evaluation_type',
        'Tipo de evaluación *',
        <>
          <select
            {...accessibility('evaluation_type')}
            value={values.evaluation_type}
            onChange={(e) => onChange('evaluation_type', e.target.value)}
            disabled={disabled}
            aria-describedby={
              [
                errorFor('evaluation_type')
                  ? `${prefix}-evaluation_type-error`
                  : null,
                values.evaluation_type === 'makeup'
                  ? `${prefix}-evaluation-info`
                  : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          >
            <option value="partial">Parcial</option>
            <option value="final">Final</option>
            <option value="makeup">2da instancia</option>
          </select>
          {values.evaluation_type === 'makeup' ? (
            <p id={`${prefix}-evaluation-info`} className={styles.inlineInfo}>
              Este tipo de examen requiere validación de habilitaciones antes
              del control de ingreso.
            </p>
          ) : null}
        </>,
      )}
      {field(
        'exam_date',
        'Fecha *',
        <input
          {...accessibility('exam_date')}
          type="date"
          min={getLocalDate()}
          value={values.exam_date}
          onChange={(e) => onChange('exam_date', e.target.value)}
          disabled={disabled}
        />,
      )}
      {field(
        'start_time',
        'Hora *',
        <input
          {...accessibility('start_time')}
          type="time"
          value={values.start_time}
          onChange={(e) => onChange('start_time', e.target.value)}
          disabled={disabled}
        />,
      )}
      {field(
        'duration_minutes',
        'Duración (minutos) *',
        <input
          {...accessibility('duration_minutes')}
          type="number"
          min={1}
          max={2147483647}
          step={1}
          value={values.duration_minutes}
          onChange={(e) => onChange('duration_minutes', e.target.value)}
          disabled={disabled}
        />,
      )}
      {field(
        'room_id',
        'Ambiente *',
        <select
          {...accessibility('room_id')}
          value={
            rooms.some((room) => String(room.id) === values.room_id)
              ? values.room_id
              : ''
          }
          onChange={(e) => onChange('room_id', e.target.value)}
          disabled={disabled || isLoadingRooms || rooms.length === 0}
        >
          {!hasSchedule ? (
            <option value="">Completa fecha, hora y duración</option>
          ) : isLoadingRooms ? (
            <option value="">Cargando ambientes...</option>
          ) : rooms.length > 0 ? (
            <>
              <option value="">Selecciona un ambiente</option>
              {rooms.map((room) => (
                <option key={room.id} value={String(room.id)}>
                  {room.code} — {room.name}
                  {room.location ? ` (${room.location})` : ''}
                </option>
              ))}
            </>
          ) : (
            <option value="">
              {roomError
                ? 'No se pudieron consultar los ambientes'
                : 'No hay ambientes disponibles para este horario'}
            </option>
          )}
        </select>,
      )}
      {field(
        'rules',
        'Normas / restricciones',
        <textarea
          {...accessibility('rules')}
          rows={4}
          value={values.rules}
          onChange={(e) => onChange('rules', e.target.value)}
          placeholder="Ej. Sin calculadoras durante la prueba."
          disabled={disabled}
        />,
        true,
      )}
      {children}
    </div>
  )
}
