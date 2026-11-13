import {
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useControllableState } from '@/shared/hooks/useControllableState'
import styles from './Tabs.module.css'

export interface TabItem {
  /** Unique identifier of the tab. */
  id: string
  /** Visible label of the tab trigger. */
  label: ReactNode
  /** Optional icon rendered before the label. */
  icon?: ReactNode
  /** Content rendered inside the corresponding `<div role="tabpanel">`. */
  content: ReactNode
  /** Disables the tab trigger. */
  disabled?: boolean
}

export interface TabsProps {
  /** Ordered list of tabs. */
  items: readonly TabItem[]
  /** Controlled active tab id. */
  value?: string
  /** Initial active tab id when uncontrolled (defaults to the first enabled tab). */
  defaultValue?: string
  /** Callback fired when the active tab changes. */
  onChange?: (nextId: string) => void
  /** Accessible label for the `<div role="tablist">`. */
  ariaLabel?: string
  className?: string
}

/**
 * Global Tabs molecule: manages internal or external state (`value` / `defaultValue` + `onChange`),
 * WAI-ARIA `tablist` / `tab` / `tabpanel` roles, and Left/Right/Home/End keyboard navigation.
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  ariaLabel = 'Secciones',
  className,
}: TabsProps) {
  const baseId = useId()
  const firstEnabledId =
    items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? ''
  const [activeId, setActiveId] = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? firstEnabledId,
    onChange,
  })
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const enabledIndices = items
    .map((item, idx) => (item.disabled ? -1 : idx))
    .filter((idx) => idx >= 0)

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    if (enabledIndices.length === 0) return
    const pos = enabledIndices.indexOf(currentIndex)
    let nextIndex = -1

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault()
        nextIndex = enabledIndices[(pos + 1) % enabledIndices.length]
        break
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault()
        nextIndex =
          enabledIndices[
            (pos - 1 + enabledIndices.length) % enabledIndices.length
          ]
        break
      }
      case 'Home': {
        event.preventDefault()
        nextIndex = enabledIndices[0]
        break
      }
      case 'End': {
        event.preventDefault()
        nextIndex = enabledIndices[enabledIndices.length - 1]
        break
      }
    }

    if (nextIndex >= 0 && items[nextIndex]) {
      setActiveId(items[nextIndex].id)
      tabRefs.current[nextIndex]?.focus()
    }
  }

  const activeItem =
    items.find((item) => item.id === activeId) ?? items[0] ?? null

  return (
    <div className={[styles.tabs, className].filter(Boolean).join(' ')}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={styles.tabList}
      >
        {items.map((item, index) => {
          const isSelected = item.id === (activeItem?.id ?? activeId)
          const tabId = `${baseId}-tab-${item.id}`
          const panelId = `${baseId}-panel-${item.id}`

          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              id={tabId}
              type="button"
              role="tab"
              data-ds-button=""
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              className={[
                styles.tab,
                isSelected ? styles.tabActive : null,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                if (!item.disabled) setActiveId(item.id)
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {item.icon ? (
                <span className={styles.tabIcon} aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {activeItem ? (
        <div
          id={`${baseId}-panel-${activeItem.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          tabIndex={0}
          className={styles.tabPanel}
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  )
}
