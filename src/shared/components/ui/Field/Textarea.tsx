import type { ComponentProps } from 'react'
import styles from './controls.module.css'

export interface TextareaProps extends ComponentProps<'textarea'> {
  /** Marks the control invalid (aria-invalid). Inside a Field, the Field sets it from its error. */
  invalid?: boolean
}

// Native <textarea> with vertical resize only, so it never overflows its container horizontally.
export function Textarea({ invalid, className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={[styles.control, styles.textarea, className].filter(Boolean).join(' ')}
      aria-invalid={invalid || props['aria-invalid'] || undefined}
    />
  )
}
