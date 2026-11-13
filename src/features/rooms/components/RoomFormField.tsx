import type { ChangeEvent } from 'react'
import { Field } from '@/shared/components/ui/Field/Field'
import { TextInput } from '@/shared/components/ui/Field/TextInput'
import { Textarea } from '@/shared/components/ui/Field/Textarea'
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
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => onChange(field.name, event.target.value)
  return (
    <Field
      label={field.label}
      required={field.required}
      // As before, the capacity hint is shown (and described) only while there is no error.
      hint={
        field.name === 'capacity' && !error
          ? 'Opcional. Indica un número entero de personas.'
          : undefined
      }
      error={error}
      className={field.multiline ? styles.fullWidth : undefined}
    >
      {(control) =>
        field.multiline ? (
          <Textarea
            {...control}
            name={field.name}
            value={value}
            maxLength={field.maxLength}
            disabled={disabled}
            rows={3}
            onChange={handleChange}
          />
        ) : (
          <TextInput
            {...control}
            name={field.name}
            value={value}
            maxLength={field.maxLength}
            disabled={disabled}
            inputMode={field.name === 'capacity' ? 'numeric' : undefined}
            autoComplete="off"
            onChange={handleChange}
          />
        )
      }
    </Field>
  )
}
