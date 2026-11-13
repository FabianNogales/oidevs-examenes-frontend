import { useId, type ComponentProps, type ReactNode } from 'react'
import { TextInput, type TextInputProps } from '../Field/TextInput'
import { Label } from '../Label/Label'
import styles from './Input.module.css'

export interface InputProps extends TextInputProps {
  /** Optional visible label directly bound via `htmlFor` + `id`. */
  label?: string
  /** Optional helper text linked via `aria-describedby`. */
  hint?: ReactNode
  /** Optional error text; marks input `aria-invalid="true"` and links via `aria-describedby`. */
  error?: ReactNode
  /** Wrapper class name when `label`, `hint`, or `error` is used. */
  wrapperClassName?: string
}

/**
 * Global Input / TextField atom.
 * Supports `type` (`text`, `email`, `number`, `password`, `search`, etc.), controlled `value` + `onChange`,
 * `disabled`, and `invalid`/`error` states. Can be used standalone inside `Field` or with its own `label`.
 */
export function Input({
  id: idProp,
  label,
  hint,
  error,
  required,
  invalid,
  wrapperClassName,
  ...props
}: InputProps) {
  const generatedId = useId()
  const controlId = idProp ?? generatedId

  if (!label && !hint && !error) {
    return (
      <TextInput
        {...props}
        id={idProp}
        required={required}
        invalid={invalid}
      />
    )
  }

  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy =
    [props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') ||
    undefined

  return (
    <div
      className={[styles.wrapper, wrapperClassName].filter(Boolean).join(' ')}
    >
      {label ? (
        <Label htmlFor={controlId} required={required}>
          {label}
        </Label>
      ) : null}
      <TextInput
        {...props}
        id={controlId}
        required={required}
        invalid={Boolean(invalid || error)}
        aria-describedby={describedBy}
      />
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export type TextFieldProps = ComponentProps<typeof Input>
export const TextField = Input
export { TextInput, type TextInputProps }
