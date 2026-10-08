import { useId, type ChangeEvent } from 'react'
import type { RoomField } from '../types/room.types'
import styles from './RoomDialog.module.css'

interface Props {
  field: {
    name: RoomField
    label: string
    maxLength: number
    required?: boolean
    multiline?: boolean
  }
  value: string
  error?: string
  disabled: boolean
  onChange: (name: RoomField, value: string) => void
}

export function RoomFormField({
  field,
  value,
  error,
  disabled,
  onChange,
}: Props) {
  const id = useId()
  const props = {
    id,
    name: field.name,
    value,
    maxLength: field.maxLength,
    disabled,
    required: field.required,
    'aria-invalid': Boolean(error),
    'aria-describedby': error
      ? `${id}-error`
      : field.name === 'capacity'
        ? `${id}-hint`
        : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field.name, event.target.value),
  }
  return (
    <div
      className={`${styles.field} ${field.multiline ? styles.fullWidth : ''}`}
    >
      <label htmlFor={id}>
        {field.label}
        {field.required && <span aria-hidden="true"> *</span>}
      </label>
      {field.multiline ? (
        <textarea {...props} rows={3} />
      ) : (
        <input
          {...props}
          type="text"
          inputMode={field.name === 'capacity' ? 'numeric' : undefined}
          autoComplete="off"
        />
      )}
      {field.name === 'capacity' && !error && (
        <small id={`${id}-hint`}>
          Opcional. Indica un número entero de personas.
        </small>
      )}
      {error && (
        <small className={styles.fieldError} id={`${id}-error`}>
          {error}
        </small>
      )}
    </div>
  )
}
