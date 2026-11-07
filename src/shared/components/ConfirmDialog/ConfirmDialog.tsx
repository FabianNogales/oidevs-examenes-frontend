import { useEffect, useId, useRef } from 'react'
import { trapDialogFocus } from '@/shared/utils/trapDialogFocus'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger' | 'success'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()
  const dialog = useRef<HTMLDivElement>(null)
  useBodyScrollLock(isOpen)
  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    // A busy dialog can open without any enabled controls.
    if (!dialog.current?.contains(document.activeElement)) dialog.current?.focus()
    return () => { if (previousFocus?.isConnected) previousFocus.focus() }
  }, [isOpen])
  useEffect(() => {
    // Disabling the focused button can move browser focus back to the page.
    if (isOpen && loading) dialog.current?.focus()
  }, [isOpen, loading])
  // Escape cierra solo este diálogo (fase de captura para no cerrar el modal que está debajo)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        if (!loading) onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, loading, onCancel])

  if (!isOpen) return null

  const confirmClass =
    variant === 'danger'
      ? styles.dangerButton
      : variant === 'success'
        ? styles.successButton
        : styles.primaryButton

  return (
    <div
      className={styles.overlay}
      onClick={() => !loading && onCancel()}
    >
      <div ref={dialog} className={styles.dialog} onClick={(e) => e.stopPropagation()}
        role="alertdialog" aria-modal="true" aria-labelledby={titleId}
        aria-describedby={messageId} tabIndex={-1} onKeyDown={trapDialogFocus}>
        <h3 id={titleId} className={styles.title}>{title}</h3>
        <p id={messageId} className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
