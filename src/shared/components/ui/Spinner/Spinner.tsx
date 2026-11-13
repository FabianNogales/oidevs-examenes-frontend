import type { ComponentProps } from 'react'
import styles from './Spinner.module.css'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps extends ComponentProps<'span'> {
  /** Tokenized size: sm (16px), md (24px), lg (32px). */
  size?: SpinnerSize
  /** Accessible announcement for screen readers when standalone. If omitted, spinner is decorative (`aria-hidden="true"`). */
  label?: string
}

/**
 * Global Spinner atom: animated loading indicator using `--color-primary` and `--color-border`.
 */
export function Spinner({
  size = 'md',
  label,
  className,
  ...props
}: SpinnerProps) {
  const classes = [styles.spinner, styles[size], className]
    .filter(Boolean)
    .join(' ')

  if (label) {
    return (
      <span
        {...props}
        role="status"
        aria-label={label}
        className={styles.wrapper}
      >
        <span className={classes} aria-hidden="true" />
      </span>
    )
  }

  return <span {...props} className={classes} aria-hidden="true" />
}
