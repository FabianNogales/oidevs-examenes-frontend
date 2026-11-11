import { Link, type LinkProps } from 'react-router'
import type { ButtonSize, ButtonVariant } from './Button'
import styles from './Button.module.css'

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

// Navigation with the look of a Button: always renders a real <a> through react-router's Link.
// It has no disabled/loading state; render a Button or plain text when navigation is not available.
export function ButtonLink({ variant = 'primary', size = 'md', className, ...props }: ButtonLinkProps) {
  const classes = [styles.button, styles[variant], size === 'sm' ? styles.sm : null, className]
    .filter(Boolean)
    .join(' ')
  return <Link {...props} className={classes} />
}
