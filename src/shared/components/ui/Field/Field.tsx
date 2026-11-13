import { useId, type ReactNode } from 'react'
import styles from './Field.module.css'

/** Props the Field hands to its control so label, hint, error and required state stay associated. */
export interface FieldControlProps {
  id: string
  required?: boolean
  'aria-invalid'?: true
  'aria-describedby'?: string
}

export interface FieldProps {
  label: string
  /** Id of the control; generated with useId when omitted. */
  htmlFor?: string
  required?: boolean
  hint?: ReactNode
  /** Visible error text; it marks the control aria-invalid and is linked through aria-describedby. */
  error?: ReactNode
  className?: string
  /** Render the control with the provided props, e.g. {(control) => <TextInput {...control} />}. */
  children: (control: FieldControlProps) => ReactNode
}

// Label + control + hint + error. The error is not a live region (no role="alert"): it is announced
// with the control through aria-describedby; announce form-level errors in a summary instead.
export function Field({ label, htmlFor, required = false, hint, error, className, children }: FieldProps) {
  const generatedId = useId()
  const id = htmlFor ?? generatedId
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        ...(required ? { required: true } : {}),
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
