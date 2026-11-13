import type { ComponentProps } from 'react'
import styles from './Card.module.css'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends ComponentProps<'div'> {
  /** Semantic element to render (`div`, `article`, `section`, `aside`). */
  as?: 'div' | 'article' | 'section' | 'aside'
  /** Applies Semi-Flat interactive elevation on hover. */
  interactive?: boolean
  /** Padding preset. Defaults to `md` (24px). */
  padding?: CardPadding
}

/**
 * Global Card molecule: slot-based surface container (`Card`, `CardHeader`, `CardTitle`,
 * `CardDescription`, `CardContent`, `CardFooter`) styled with `--color-surface` and tinted shadow.
 */
export function Card({
  as: Tag = 'div',
  interactive = false,
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  const classes = [
    styles.card,
    styles[`padding-${padding}`],
    interactive ? styles.interactive : null,
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

export type CardHeaderProps = ComponentProps<'header'>

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <header
      {...props}
      className={[styles.header, className].filter(Boolean).join(' ')}
    >
      {children}
    </header>
  )
}

export interface CardTitleProps extends ComponentProps<'h3'> {
  as?: 'h2' | 'h3' | 'h4'
}

export function CardTitle({
  as: Tag = 'h3',
  className,
  children,
  ...props
}: CardTitleProps) {
  return (
    <Tag
      {...props}
      className={[styles.title, className].filter(Boolean).join(' ')}
    >
      {children}
    </Tag>
  )
}

export type CardDescriptionProps = ComponentProps<'p'>

export function CardDescription({
  className,
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      {...props}
      className={[styles.description, className].filter(Boolean).join(' ')}
    >
      {children}
    </p>
  )
}

export type CardContentProps = ComponentProps<'div'>

export function CardContent({
  className,
  children,
  ...props
}: CardContentProps) {
  return (
    <div
      {...props}
      className={[styles.content, className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}

export type CardFooterProps = ComponentProps<'footer'>

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <footer
      {...props}
      className={[styles.footer, className].filter(Boolean).join(' ')}
    >
      {children}
    </footer>
  )
}
