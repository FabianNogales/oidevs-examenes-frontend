import type { ComponentType, ReactElement, SVGProps } from 'react'
import styles from './Icon.module.css'

export type IconSize = 'sm' | 'md' | 'lg'
export type IconComponentType = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string }
>

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Lucide icon component or custom SVG component. */
  icon?: IconComponentType
  /** Optional pre-rendered SVG element. */
  children?: ReactElement
  /** Tokenized size: sm (16px), md (20px), lg (24px). Inherits text color (currentColor). */
  size?: IconSize
  /** Accessible label for meaningful icons. When omitted, the icon is decorative (`aria-hidden="true"`). */
  label?: string
}

/**
 * Global Icon atom: inherits `currentColor` and scales with tokenized sizes.
 * Decorative by default (`aria-hidden="true"`), or semantic (`role="img"`) when `label` is provided.
 */
export function Icon({
  icon: IconComponent,
  children,
  size = 'md',
  label,
  className,
  ...props
}: IconProps) {
  const isDecorative = !label
  const classes = [styles.icon, styles[size], className]
    .filter(Boolean)
    .join(' ')

  const a11yProps = isDecorative
    ? { 'aria-hidden': true as const, focusable: 'false' as const }
    : { role: 'img' as const, 'aria-label': label }

  if (IconComponent) {
    return <IconComponent {...props} {...a11yProps} className={classes} />
  }

  return (
    <span className={classes} {...a11yProps}>
      {children}
    </span>
  )
}
