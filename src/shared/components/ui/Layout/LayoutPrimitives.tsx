import type { ComponentProps } from 'react'
import {
  PageContainer,
  type PageContainerProps,
  type PageContainerWidth,
} from '../PageContainer/PageContainer'
import styles from './LayoutPrimitives.module.css'

export type SpacingToken = '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12'
export type GridColumns = 1 | 2 | 3 | 4

export interface GridProps extends ComponentProps<'div'> {
  /** Number of columns on desktop (`1`–`4`); automatically collapses to 1 column on mobile (`<= 640px`). */
  columns?: GridColumns
  /** Spacing token between grid cells (`--space-*`). Defaults to `'4'` (16px). */
  gap?: SpacingToken
  /** Vertical alignment of grid items. */
  align?: 'start' | 'center' | 'end' | 'stretch'
}

/**
 * Global Grid layout primitive: multi-column responsive layout that reorganizes into a single
 * column on mobile without ad-hoc margins.
 */
export function Grid({
  columns = 2,
  gap = '4',
  align = 'stretch',
  className,
  children,
  ...props
}: GridProps) {
  const classes = [
    styles.grid,
    styles[`cols-${columns}`],
    styles[`gap-${gap}`],
    styles[`align-${align}`],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div {...props} className={classes}>
      {children}
    </div>
  )
}

export interface StackProps extends ComponentProps<'div'> {
  /** Stack direction (`vertical` column or `horizontal` row). */
  direction?: 'vertical' | 'horizontal'
  /** Spacing token between children (`--space-*`). Defaults to `'4'` (16px). */
  gap?: SpacingToken
  /** Cross-axis alignment. */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Main-axis justification. */
  justify?: 'start' | 'center' | 'end' | 'between'
  /** Allows items to wrap onto multiple lines when horizontal. */
  wrap?: boolean
}

/**
 * Global Stack layout primitive: manages consistent vertical or horizontal spacing
 * between child elements using `--space-*` tokens instead of ad-hoc margins.
 */
export function Stack({
  direction = 'vertical',
  gap = '4',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
  children,
  ...props
}: StackProps) {
  const classes = [
    styles.stack,
    direction === 'horizontal' ? styles.horizontal : styles.vertical,
    styles[`gap-${gap}`],
    styles[`align-${align}`],
    styles[`justify-${justify}`],
    wrap ? styles.wrap : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div {...props} className={classes}>
      {children}
    </div>
  )
}

export const Container = PageContainer
export type ContainerProps = PageContainerProps
export { PageContainer, type PageContainerProps, type PageContainerWidth }
