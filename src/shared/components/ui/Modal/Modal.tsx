import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import { trapDialogFocus } from '@/shared/utils/trapDialogFocus'
import {
  PortalDialog,
  type PortalDialogProps,
} from '@/shared/components/PortalDialog/PortalDialog'
import {
  ConfirmDialog,
  type ConfirmDialogProps,
} from '@/shared/components/ConfirmDialog/ConfirmDialog'
import { Button } from '../Button/Button'
import styles from './Modal.module.css'

export interface ModalProps {
  /** Controls whether the modal is open. Defaults to `true` when mounted conditionally. */
  isOpen?: boolean
  /** Accessible dialog title (`<h2>` linked via `aria-labelledby`). */
  title: string
  /** Optional subtitle or description (`aria-describedby`). */
  description?: ReactNode
  /** Modal body content. */
  children?: ReactNode
  /** Optional custom footer slot. Overrides built-in confirm/cancel buttons when provided. */
  footer?: ReactNode
  /** Callback fired when closing the modal (Esc, backdrop click, close button, or Cancel button). */
  onClose: () => void
  /** Optional primary confirmation callback. When provided, renders Confirm/Cancel action buttons. */
  onConfirm?: () => void
  /** Label for the confirm action button (defaults to `"Confirmar"`). */
  confirmLabel?: string
  /** Label for the cancel action button (defaults to `"Cancelar"`). */
  cancelLabel?: string
  /** Variant for the confirm button (`primary` or `danger`). */
  confirmVariant?: 'primary' | 'danger'
  /** Disables closing and marks the dialog `aria-busy="true"`. */
  loading?: boolean
  /** Size preset (`sm`, `md`, `lg`). */
  size?: 'sm' | 'md' | 'lg'
  /** Element to focus when the modal opens. Defaults to the first focusable control inside the modal. */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** Renders inside `document.body` via `createPortal` when available (can be disabled for static SSR tests). */
  usePortal?: boolean
  className?: string
}

/**
 * Global Modal / Dialog organism:
 * - Renders in a React Portal (`document.body`) and locks background scroll (`useBodyScrollLock`).
 * - Focuses the first interactive element on open, traps Tab/Shift+Tab focus (`trapDialogFocus`),
 *   closes on `Escape` or backdrop click, and exposes accessible `aria-labelledby` / `aria-describedby`.
 * - Supports clear Confirm/Cancel actions or custom `footer` slots.
 */
export function Modal({
  isOpen = true,
  title,
  description,
  children,
  footer,
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'primary',
  loading = false,
  size = 'md',
  initialFocusRef,
  usePortal = true,
  className,
}: ModalProps) {
  const titleId = useId()
  const descId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const target =
      initialFocusRef?.current ??
      dialogRef.current?.querySelector<HTMLElement>(
        'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)',
      ) ??
      closeButtonRef.current ??
      dialogRef.current

    target?.focus()

    return () => {
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [isOpen, initialFocusRef])

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onClose])

  if (!isOpen) return null

  const hasFooter = footer !== undefined || Boolean(onConfirm)

  const modalNode = (
    <div
      className={styles.backdrop}
      onClick={() => {
        if (!loading) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-busy={loading || undefined}
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={[styles.modal, styles[size], className]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={trapDialogFocus}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description ? (
              <p id={descId} className={styles.description}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            data-ds-button=""
            disabled={loading}
            aria-label="Cerrar ventana"
            className={styles.closeButton}
            onClick={() => {
              if (!loading) onClose()
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {children ? <div className={styles.body}>{children}</div> : null}

        {hasFooter ? (
          <footer className={styles.footer}>
            {footer !== undefined ? (
              footer
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading}
                  onClick={onClose}
                >
                  {cancelLabel}
                </Button>
                {onConfirm ? (
                  <Button
                    type="button"
                    variant={confirmVariant}
                    loading={loading}
                    onClick={onConfirm}
                  >
                    {loading ? 'Procesando…' : confirmLabel}
                  </Button>
                ) : null}
              </>
            )}
          </footer>
        ) : null}
      </div>
    </div>
  )

  if (
    usePortal &&
    typeof document !== 'undefined' &&
    document.body &&
    typeof createPortal === 'function'
  ) {
    return createPortal(modalNode, document.body)
  }

  return modalNode
}

export const Dialog = Modal
export {
  PortalDialog,
  ConfirmDialog,
  type PortalDialogProps,
  type ConfirmDialogProps,
}
