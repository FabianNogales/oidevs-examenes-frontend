import type { ComponentProps, ReactNode } from 'react'
import styles from './Badge.module.css'

export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends ComponentProps<'span'> {
  /** Semantic tone mapped to Semi-Flat Design 2.0 soft surface + solid border/foreground. */
  tone?: BadgeTone
  /** Visual size variant. */
  size?: BadgeSize
  /** Optional leading icon (decorative). */
  icon?: ReactNode
}

/**
 * Global Badge atom: displays status, category, or metadata labels using Semi-Flat palette tokens.
 * Note: Warning tone uses navy primary text (`--color-text-primary`) for WCAG AA contrast.
 */
export function Badge({
  tone = 'neutral',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[tone],
    size === 'sm' ? styles.sm : styles.md,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span {...props} className={classes}>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  )
}
