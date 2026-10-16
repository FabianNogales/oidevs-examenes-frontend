import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './RoomDialog.module.css'

export function RoomModal({
  title,
  busy = false,
  onClose,
  children,
}: {
  title: string
  busy?: boolean
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    element?.showModal()
    element?.querySelector<HTMLInputElement>('[name="code"]')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      element?.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
      else document.getElementById('rooms-title')?.focus()
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
          <p>Gestión de aulas</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar ventana"
        >
          ×
        </button>
      </header>
      <div className={styles.body}>{children}</div>
    </dialog>
  )
}
