import type { ComponentProps } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm'

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  /** md: standard control height (44px). sm: compact height (36px), only for secondary desktop actions. */
  size?: ButtonSize
  /** Disables the button and sets aria-busy; the consumer keeps the visible text (e.g. "Guardando…"). */
  loading?: boolean
}

// Native <button> with Design System styles. Icon-only buttons must receive an accessible
// name from the consumer (aria-label or visually hidden text); no generic name is imposed.
// data-ds-button is a stable marker: containers with generic `button` rules (PortalDialog)
// exclude it so they never override the Design System look (DS4.2c.1).
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  type = 'button',
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'sm' ? styles.sm : null, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      {...props}
      type={type}
      className={classes}
      data-ds-button=""
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {children}
    </button>
  )
}
