import type { ComponentProps, ReactNode } from 'react'
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import styles from './Typography.module.css'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
export type HeadingVisualSize = 'h1' | 'h2' | 'h3' | 'body' | 'small'
export type TextTone =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'danger'

export interface HeadingProps extends ComponentProps<'h2'> {
  /** Semantic heading level (`h1`–`h6`). Defaults to `2`. */
  level?: HeadingLevel
  /** Optional explicit tag alias (`h1`–`h6`). */
  as?: `h${HeadingLevel}`
  /** Visual typography token override (decouples semantic level from visual appearance). */
  size?: HeadingVisualSize
  /** Semantic color tone. */
  tone?: TextTone
}

const DEFAULT_SIZE_BY_LEVEL: Record<HeadingLevel, HeadingVisualSize> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'body',
  5: 'small',
  6: 'small',
}

/**
 * Global Heading atom: separates the semantic heading level (`h1`–`h6`) from the
 * visual typography token (`h1`, `h2`, `h3`, `body`, `small`).
 */
export function Heading({
  level = 2,
  as,
  size,
  tone = 'primary',
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = (as ?? `h${level}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const resolvedLevel = as ? (Number(as.slice(1)) as HeadingLevel) : level
  const visualSize = size ?? DEFAULT_SIZE_BY_LEVEL[resolvedLevel]

  const classes = [
    styles.heading,
    styles[`size-${visualSize}`],
    styles[`tone-${tone}`],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag {...props} className={classes}>
      {children}
    </Tag>
  )
}

export type TextTag = 'p' | 'span' | 'div' | 'small' | 'strong'
export type TextVariant = 'body' | 'small' | 'interactive'

export interface TextProps extends ComponentProps<'p'> {
  /** HTML element tag to render (`p`, `span`, `div`, `small`, `strong`). */
  as?: TextTag
  /** Semi-Flat typography token (`body` = 16/24, `small` = 14/21, `interactive` = 14/16 semibold). */
  variant?: TextVariant
  /** Color tone. Defaults to `primary` for `body`/`interactive` and `secondary` for `small`. */
  tone?: TextTone
  /** Font weight override (`regular` = 400, `semibold` = 600). */
  weight?: 'regular' | 'semibold'
}

/**
 * Global Text atom: renders tokenized body, small, or interactive text with semantic HTML tags.
 */
export function Text({
  as: Tag = 'p',
  variant = 'body',
  tone,
  weight,
  className,
  children,
  ...props
}: TextProps) {
  const resolvedTone = tone ?? (variant === 'small' ? 'secondary' : 'primary')
  const classes = [
    styles.text,
    styles[`variant-${variant}`],
    styles[`tone-${resolvedTone}`],
    weight ? styles[`weight-${weight}`] : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag {...props} className={classes}>
      {children}
    </Tag>
  )
}

export interface LinkProps
  extends Omit<ComponentProps<'a'>, 'href'> {
  /** Internal route path (`to`) or external URL (`href`). */
  to?: RouterLinkProps['to']
  /** External or anchor URL. */
  href?: string
  /** Explicitly marks the link as external (opens in new tab with `rel="noopener noreferrer"`). */
  external?: boolean
  /** Visual variant. */
  variant?: 'default' | 'subtle' | 'accent'
  /** Shows external link icon when external. Defaults to `true`. */
  showExternalIcon?: boolean
  children: ReactNode
}

export function isExternalHref(href?: string): boolean {
  if (!href) return false
  return /^(?:https?:\/\/|mailto:|tel:)/i.test(href)
}

/**
 * Global Link atom: distinguishes internal SPA links (`react-router` `<Link>`) from
 * external URLs (`<a target="_blank" rel="noopener noreferrer">`).
 */
export function Link({
  to,
  href,
  external,
  variant = 'default',
  showExternalIcon = true,
  className,
  children,
  ...props
}: LinkProps) {
  const targetHref = href ?? (typeof to === 'string' ? to : undefined)
  const isExternal = external ?? isExternalHref(targetHref)

  const classes = [styles.link, styles[`link-${variant}`], className]
    .filter(Boolean)
    .join(' ')

  if (isExternal || (!to && href)) {
    return (
      <a
        {...props}
        href={targetHref}
        className={classes}
        target={isExternal ? (props.target ?? '_blank') : props.target}
        rel={
          isExternal ? (props.rel ?? 'noopener noreferrer') : props.rel
        }
        data-external={isExternal ? 'true' : undefined}
      >
        <span>{children}</span>
        {isExternal && showExternalIcon ? (
          <ExternalLinkIcon className={styles.externalIcon} aria-hidden="true" />
        ) : null}
      </a>
    )
  }

  return (
    <RouterLink
      {...(props as Omit<RouterLinkProps, 'to'>)}
      to={to ?? '/'}
      className={classes}
      data-external="false"
    >
      {children}
    </RouterLink>
  )
}
