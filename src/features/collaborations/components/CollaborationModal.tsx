import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import modalStyles from '@/features/students/components/AddStudentsModal.module.css'

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
  const dialog = useRef<HTMLDivElement>(null)
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

  return (
    <div
      className={modalStyles.overlay}
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
          if (event.key !== 'Tab') return
          const elements = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]',
            ) ?? [],
          )
          const first = elements[0]
          const last = elements.at(-1)
          if (!first || !last) {
            event.preventDefault()
            return
          }
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === dialog.current)
          ) {
            event.preventDefault()
            last.focus()
          } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
              document.activeElement === dialog.current)
          ) {
            event.preventDefault()
            first.focus()
          }
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
