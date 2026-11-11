import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import styles from './PortalDialog.module.css'

export interface PortalDialogProps {
  title: string
  busy?: boolean
  closeBlocked?: boolean
  onClose: () => void
  children: ReactNode
  drawer?: boolean
  /** Footer outside the scrolling body; submit buttons may target a form by id. */
  footer?: ReactNode
  /** Compatibility hooks for existing feature-specific styles. */
  className?: string
  headerClassName?: string
  bodyClassName?: string
  /** Element focused when the dialog opens. Defaults to the close button (unchanged behaviour). */
  initialFocus?: RefObject<HTMLElement | null>
}

export function PortalDialog({
  title,
  busy = false,
  closeBlocked = false,
  onClose,
  children,
  drawer = false,
  footer,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  initialFocus,
}: PortalDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const mounted = useRef(false)
  const titleId = useId()
  useBodyScrollLock(true)
  useEffect(() => {
    const element = dialog.current
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    mounted.current = true
    element?.showModal()
    ;(initialFocus?.current ?? close.current)?.focus()
    return () => {
      mounted.current = false
      element?.close()
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
    // Runs once per mount: the dialog opens when it is rendered; initialFocus is read on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const requestClose = () => {
    if (!busy && !closeBlocked) onClose()
  }
  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${drawer ? styles.drawer : ''} ${className}`}
      data-has-footer={footer != null ? 'true' : undefined}
      aria-labelledby={titleId}
      aria-modal="true"
      aria-busy={busy}
      onKeyDown={(event) => {
        // Handle Escape before it becomes a native close request: without user
        // activation Chrome may ignore preventDefault() on cancel or close a whole
        // group of dialogs (this Drawer and its nested confirmations) at once.
        if (
          event.key !== 'Escape' ||
          event.defaultPrevented ||
          event.nativeEvent.isComposing
        )
          return
        const owner = (event.target as Element).closest?.('dialog')
        if (!owner || !event.currentTarget.contains(owner)) return
        event.preventDefault()
        event.stopPropagation()
        if (owner === event.currentTarget) {
          requestClose()
          return
        }
        // Nested dialogs keep their own semantics through a cancel event.
        const cancel = new Event('cancel', { cancelable: true })
        if (owner.dispatchEvent(cancel)) owner.close()
      }}
      onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        requestClose()
      }}
      onClose={(event) => {
        // A native close while React still renders the dialog leaves it invisible
        // and the page scroll-locked; reopen it and keep nested dialogs on top.
        const element = event.currentTarget
        if (event.target !== element || !mounted.current || element.open) return
        element.showModal()
        element
          .querySelectorAll<HTMLDialogElement>('dialog[open]')
          .forEach((nested) => {
            nested.close()
            nested.showModal()
          })
      }}
    >
      <header className={`${styles.dialogHeader} ${headerClassName}`}>
        <h2 id={titleId}>{title}</h2>
        <button
          ref={close}
          type="button"
          onClick={onClose}
          disabled={busy || closeBlocked}
          aria-label="Cerrar ventana"
        >
          ×
        </button>
      </header>
      <div className={`${drawer ? styles.drawerBody : ''} ${bodyClassName}`}>
        {children}
      </div>
      {footer != null ? (
        <footer className={styles.footer}>{footer}</footer>
      ) : null}
    </dialog>
  )
}
