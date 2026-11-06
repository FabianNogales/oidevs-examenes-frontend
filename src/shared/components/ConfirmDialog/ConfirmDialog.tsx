import { useEffect, useId, useRef } from 'react'
import { trapDialogFocus } from '@/shared/utils/trapDialogFocus'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  /** Native top-layer mode for confirmations above a modal Drawer. */
  native?: boolean
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
  native = false,
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
  const modal = useRef<HTMLDialogElement>(null)
  const shown = useRef(false)
  useBodyScrollLock(isOpen)
  useEffect(() => {
    if (!isOpen || !native) return
    const element = modal.current
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    shown.current = true
    element?.showModal()
    return () => {
      shown.current = false
      element?.close()
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [isOpen, native])
  useEffect(() => {
    if (!isOpen) return
    const previousFocus =
      !native && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    dialog.current
      ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
      ?.focus()
    // A busy dialog can open without any enabled controls.
    if (!dialog.current?.contains(document.activeElement))
      dialog.current?.focus()
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [isOpen, native])
  useEffect(() => {
    // Disabling the focused button can move browser focus back to the page.
    if (isOpen && loading) dialog.current?.focus()
  }, [isOpen, loading])
  // Non-native dialogs need the capture listener so Escape does not close the modal below.
  // Native dialogs receive their own top-layer cancel event instead.
  useEffect(() => {
    if (!isOpen || native) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (!loading) onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, loading, onCancel, native])

  if (!isOpen) return null

  const confirmClass =
    variant === 'danger'
      ? styles.dangerButton
      : variant === 'success'
        ? styles.successButton
        : styles.primaryButton

  const content = (
    <div
      ref={dialog}
      className={styles.dialog}
      onClick={(e) => e.stopPropagation()}
      role={native ? undefined : 'alertdialog'}
      aria-modal={native ? undefined : true}
      aria-labelledby={native ? undefined : titleId}
      aria-describedby={native ? undefined : messageId}
      tabIndex={-1}
      onKeyDown={trapDialogFocus}
    >
      <h3 id={titleId} className={styles.title}>
        {title}
      </h3>
      <p id={messageId} className={styles.message}>
        {message}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={confirmClass}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Procesando...' : confirmLabel}
        </button>
      </div>
    </div>
  )
  return native ? (
    <dialog
      ref={modal}
      className={styles.nativeDialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onKeyDown={(event) => {
        // Escape is handled here, before it becomes a native close request:
        // without user activation Chrome may ignore preventDefault() on cancel
        // or close this confirmation together with the Drawer below it.
        if (
          event.key !== 'Escape' ||
          event.defaultPrevented ||
          event.nativeEvent.isComposing
        )
          return
        event.preventDefault()
        event.stopPropagation()
        if (!loading) onCancel()
      }}
      onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (!loading) onCancel()
      }}
      onClose={(event) => {
        // A native close the component did not request is treated as a cancel so
        // no invisible confirmation stays mounted; a busy one is shown again.
        const element = event.currentTarget
        if (event.target !== element || !shown.current || element.open) return
        if (loading) element.showModal()
        else onCancel()
      }}
    >
      {content}
    </dialog>
  ) : (
    <div className={styles.overlay} onClick={() => !loading && onCancel()}>
      {content}
    </div>
  )
}
