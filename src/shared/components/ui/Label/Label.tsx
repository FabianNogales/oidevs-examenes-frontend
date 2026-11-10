import type { ComponentProps } from 'react'
import styles from './Label.module.css'

export interface LabelProps extends ComponentProps<'label'> {
  /** Renders an aria-hidden visual required indicator (*) next to the label text. */
  required?: boolean
  /** Visual size variant. */
  size?: 'sm' | 'md'
}

/**
 * Global Label atom: stateless, semantic `<label>` bound to Design System tokens.
 */
export function Label({
  required = false,
  size = 'sm',
  className,
  children,
  ...props
}: LabelProps) {
  const classes = [
    styles.label,
    size === 'md' ? styles.sizeMd : styles.sizeSm,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label {...props} className={classes}>
      {children}
      {required ? (
        <span className={styles.required} aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  )
}
