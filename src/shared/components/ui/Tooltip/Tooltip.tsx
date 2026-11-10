import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import styles from './Tooltip.module.css'

export type TooltipPlacement = 'top' | 'bottom'

export interface TooltipProps {
  /** Short, non-critical, non-interactive descriptive text. */
  content: ReactNode
  /** Placement of the tooltip bubble relative to the trigger. */
  placement?: TooltipPlacement
  /** Trigger element that receives focus and hover handlers + `aria-describedby`. */
  children: ReactElement
  className?: string
}

/**
 * Global Tooltip molecule: appears on both keyboard focus (`onFocus`) and pointer hover (`onMouseEnter`),
 * dismisses on blur, mouse leave, or `Escape` key. Never contains interactive controls (`pointer-events: none`).
 */
export function Tooltip({
  content,
  placement = 'top',
  children,
  className,
}: TooltipProps) {
  const tooltipId = useId()
  const [visible, setVisible] = useState(false)

  const childProps = isValidElement(children)
    ? (children.props as Record<string, unknown>)
    : {}

  const describedBy = visible
    ? [childProps['aria-describedby'], tooltipId].filter(Boolean).join(' ')
    : (childProps['aria-describedby'] as string | undefined)

  return (
    <span
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && visible) {
          setVisible(false)
        }
      }}
    >
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            'aria-describedby': describedBy,
          })
        : children}

      {visible ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={[
            styles.tooltip,
            placement === 'bottom' ? styles.bottom : styles.top,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
