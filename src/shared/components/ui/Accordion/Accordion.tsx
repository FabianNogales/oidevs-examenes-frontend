import { useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useControllableState } from '@/shared/hooks/useControllableState'
import styles from './Accordion.module.css'

export interface AccordionItem {
  /** Unique identifier of the accordion section. */
  id: string
  /** Visible heading trigger text. */
  title: ReactNode
  /** Optional subtitle or metadata in the header. */
  subtitle?: ReactNode
  /** Collapsible body content. */
  content: ReactNode
  /** Disables toggling this item. */
  disabled?: boolean
}

export interface AccordionProps {
  /** List of accordion sections. */
  items: readonly AccordionItem[]
  /** Allows multiple sections to be open simultaneously. */
  multiple?: boolean
  /** Controlled open item id(s). */
  value?: readonly string[]
  /** Initial open item id(s) when uncontrolled. */
  defaultValue?: readonly string[]
  /** Callback fired when open item id(s) change. */
  onChange?: (nextOpenIds: string[]) => void
  className?: string
}

/**
 * Global Accordion molecule: supports single or multiple open panels, controlled or
 * uncontrolled state (`value` / `defaultValue` + `onChange`), and accessible `aria-expanded` + `role="region"`.
 */
export function Accordion({
  items,
  multiple = false,
  value,
  defaultValue = [],
  onChange,
  className,
}: AccordionProps) {
  const baseId = useId()
  const [openIds, setOpenIds] = useControllableState<readonly string[]>({
    value,
    defaultValue,
    onChange: (next) => onChange?.([...next]),
  })

  function toggleItem(id: string, disabled?: boolean) {
    if (disabled) return
    const isCurrentlyOpen = openIds.includes(id)
    if (multiple) {
      const next = isCurrentlyOpen
        ? openIds.filter((item) => item !== id)
        : [...openIds, id]
      setOpenIds(next)
    } else {
      setOpenIds(isCurrentlyOpen ? [] : [id])
    }
  }

  return (
    <div className={[styles.accordion, className].filter(Boolean).join(' ')}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id)
        const triggerId = `${baseId}-trigger-${item.id}`
        const panelId = `${baseId}-panel-${item.id}`

        return (
          <div
            key={item.id}
            className={[styles.item, isOpen ? styles.itemOpen : null]
              .filter(Boolean)
              .join(' ')}
          >
            <h3 className={styles.heading}>
              <button
                id={triggerId}
                type="button"
                data-ds-button=""
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={item.disabled}
                className={styles.trigger}
                onClick={() => toggleItem(item.id, item.disabled)}
              >
                <span className={styles.triggerText}>
                  <span className={styles.title}>{item.title}</span>
                  {item.subtitle ? (
                    <span className={styles.subtitle}>{item.subtitle}</span>
                  ) : null}
                </span>
                <ChevronDown
                  className={[
                    styles.chevron,
                    isOpen ? styles.chevronOpen : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                />
              </button>
            </h3>

            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className={styles.panel}
              >
                {item.content}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
