import { useState, type ComponentProps } from 'react'
import styles from './Avatar.module.css'

export type AvatarSize = 'sm' | 'md' | 'lg'
export type AvatarShape = 'circle' | 'rounded'

export interface AvatarProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Optional image URL. Falls back to initials when absent or on load error. */
  src?: string | null
  /** Accessible alt text for the avatar image or label. */
  alt?: string
  /** Full name used to compute initials when `initials` is not explicitly provided. */
  name?: string
  /** Explicit 1–2 character initials override. */
  initials?: string
  /** Tokenized size: sm (32px), md (40px), lg (48px). */
  size?: AvatarSize
  /** Shape variant: circle (pill) or rounded (radius-md). */
  shape?: AvatarShape
}

export function computeInitials(name?: string, explicitInitials?: string): string {
  if (explicitInitials && explicitInitials.trim().length > 0) {
    return explicitInitials.trim().slice(0, 2).toUpperCase()
  }
  if (!name || !name.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

/**
 * Global Avatar atom: displays a user photo or accessible initials fallback.
 */
export function Avatar({
  src,
  alt,
  name,
  initials,
  size = 'md',
  shape = 'circle',
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const showImage = Boolean(src && !imageError)
  const fallbackText = computeInitials(name, initials)
  const accessibleLabel = alt ?? name

  const classes = [
    styles.avatar,
    styles[size],
    shape === 'rounded' ? styles.rounded : styles.circle,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      {...props}
      className={classes}
      role={!showImage && accessibleLabel ? 'img' : props.role}
      aria-label={!showImage ? accessibleLabel : undefined}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={accessibleLabel ?? ''}
          className={styles.image}
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={styles.initials} aria-hidden={Boolean(accessibleLabel) || undefined}>
          {fallbackText}
        </span>
      )}
    </span>
  )
}
