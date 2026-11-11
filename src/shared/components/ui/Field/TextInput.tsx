import type { ComponentProps } from 'react'
import styles from './controls.module.css'

export interface TextInputProps extends ComponentProps<'input'> {
  /** Marks the control invalid (aria-invalid). Inside a Field, the Field sets it from its error. */
  invalid?: boolean
}

// Native <input> (ref supported as a prop in React 19) with Design System styles.
export function TextInput({ invalid, className, type = 'text', ...props }: TextInputProps) {
  return (
    <input
      {...props}
      type={type}
      className={[styles.control, className].filter(Boolean).join(' ')}
      aria-invalid={invalid || props['aria-invalid'] || undefined}
    />
  )
}
