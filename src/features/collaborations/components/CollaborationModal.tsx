import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { trapDialogFocus } from '@/shared/utils/trapDialogFocus'
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
  useEffect(() => {
    if (busy) dialog.current?.focus()
  }, [busy])

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
