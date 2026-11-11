import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import styles from '@/shared/styles/dialogBase.module.css'
import local from './StudentDialog.module.css'

// Native modal <dialog> shared by the student dialogs (DS4.2b). It lives in the browser's top layer,
// so neither the sticky Header nor the Snackbar can paint over it, without any z-index.
// Kept as a justified exception to PortalDialog (G7) because of three contracts PortalDialog does
// not offer: a kicker above the title with a subtitle below the header, initial focus on the dialog
// itself when no element is given, and focus returned to the dialog while busy.
export function StudentDialog({
  title,
  kicker,
  subtitle,
  busy = false,
  closeOnBackdrop = false,
  initialFocus,
  onClose,
  children,
}: {
  title: string
  kicker?: string
  subtitle?: string
  /** Blocks Escape, the close button and backdrop clicks while an operation is pending. */
  busy?: boolean
  /** Click on the backdrop closes the dialog (previous CollaborationModal overlay behaviour). */
  closeOnBackdrop?: boolean
  /** Element focused on open; the dialog itself when omitted. */
  initialFocus?: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  useBodyScrollLock(true)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element?.showModal()
    ;(initialFocus?.current ?? element)?.focus()
    return () => {
      element?.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
    // Runs once per mount: the dialog opens when the component is rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    // Disabled controls drop focus; keep it inside the dialog while busy.
    if (busy) dialog.current?.focus()
  }, [busy])
  const close = () => {
    if (!busy) onClose()
  }
  return (
    <dialog
      ref={dialog}
      className={local.dialog}
      aria-labelledby={titleId}
      aria-busy={busy}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect()
          const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom
          if (outside) close()
        }
      }}
    >
      <header className={styles.header}>
        <div>
          {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Cerrar modal"
          disabled={busy}
          onClick={close}
        >
          ×
        </button>
      </header>
      {subtitle ? <p className={styles.subjectName}>{subtitle}</p> : null}
      {children}
    </dialog>
  )
}
