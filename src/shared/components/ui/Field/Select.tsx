import type { ComponentProps } from 'react'
import styles from './controls.module.css'

export interface SelectProps extends ComponentProps<'select'> {
  /** Marks the control invalid (aria-invalid). Inside a Field, the Field sets it from its error. */
  invalid?: boolean
}

// Native <select>: keeps the platform keyboard behaviour; children are native <option>/<optgroup>.
export function Select({ invalid, className, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={[styles.control, className].filter(Boolean).join(' ')}
      aria-invalid={invalid || props['aria-invalid'] || undefined}
    />
  )
}
