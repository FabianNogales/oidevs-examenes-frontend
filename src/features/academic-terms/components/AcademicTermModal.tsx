import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './AcademicTermModal.module.css'

export function AcademicTermModal({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  busy?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const element = dialog.current
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    element?.showModal()
    closeButton.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      element?.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
      else document.getElementById('academic-terms-title')?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <header className={styles.header}>
        <div>
          <p>Periodos académicos</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          ref={closeButton}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Cerrar ventana"
          disabled={busy}
        >
          ×
        </button>
      </header>
      <div className={styles.body}>{children}</div>
    </dialog>
  )
}
