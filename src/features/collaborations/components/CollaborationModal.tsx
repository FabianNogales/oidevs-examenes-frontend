import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { trapDialogFocus } from '@/shared/utils/trapDialogFocus'
import modalStyles from '@/shared/styles/dialogBase.module.css'

type Props = {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}

export function CollaborationModal({
  title,
  children,
  onClose,
  busy = false,
}: Props) {
  const titleId = useId()
  const overlay = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  // DS4.2c.2: the overlay is a manual popover so it is painted in the browser's top layer, above the
  // sticky Header, without z-index. Same DOM, API and behaviour: focus, Tab trap, Escape, backdrop and
  // busy are still handled below (a manual popover is not modal and never closes by itself).
  // Without Popover API support the overlay keeps its previous z-index stacking.
  useLayoutEffect(() => {
    const element = overlay.current
    if (!element || typeof element.showPopover !== 'function') return
    try {
      element.showPopover()
    } catch {
      return
    }
    // A modal rendered open inside this one was promoted first; keep it on top.
    element
      .querySelectorAll<HTMLElement>('[popover]:popover-open')
      .forEach((nested) => {
        nested.hidePopover()
        nested.showPopover()
      })
  }, [])
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])
  useEffect(() => {
    if (busy) dialog.current?.focus()
  }, [busy])

  return (
    <div
      ref={overlay}
      popover="manual"
      className={modalStyles.overlay}
      // The overlay is not focusable: a press on it would move focus to <body>, outside the Tab trap.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) event.preventDefault()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={dialog}
        className={modalStyles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            if (!busy) onClose()
          }
          trapDialogFocus(event)
        }}
      >
        <div className={modalStyles.header}>
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className={modalStyles.closeButton}
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
