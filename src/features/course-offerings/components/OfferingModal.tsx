import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import styles from '@/features/subjects/components/SubjectDialog.module.css'

export function OfferingModal({
  title,
  busy,
  onClose,
  children,
}: {
  title: string
  busy: boolean
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const element = dialog.current
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const overflow = document.body.style.overflow
    element?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element?.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <header className={styles.header}>
        <div>
          <p>Asignaciones de materias</p>
          <h2 id={id}>{title}</h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          disabled={busy}
          onClick={onClose}
          aria-label="Cerrar ventana"
        >
          ×
        </button>
      </header>
      <div className={styles.body}>{children}</div>
    </dialog>
  )
}
