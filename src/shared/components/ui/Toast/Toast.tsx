import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type Context,
  type ReactNode,
} from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react'
import styles from './Toast.module.css'

export type FeedbackTone = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Semantic tone mapped to Semi-Flat Design 2.0 soft surface + solid border/icon/title. */
  tone?: FeedbackTone
  /** Optional bold title at the top of the alert. */
  title?: ReactNode
  /** Optional action slot (e.g. a retry button). */
  action?: ReactNode
  /** Optional callback to dismiss the alert manually. */
  onClose?: () => void
}

function getToneIcon(tone: FeedbackTone) {
  switch (tone) {
    case 'success':
      return <CheckCircle2 className={styles.icon} aria-hidden="true" />
    case 'warning':
      return <AlertTriangle className={styles.icon} aria-hidden="true" />
    case 'danger':
      return <AlertCircle className={styles.icon} aria-hidden="true" />
    default:
      return <Info className={styles.icon} aria-hidden="true" />
  }
}

/**
 * Global Alert / Banner organism:
 * Uses `role="alert"` for `danger`/`warning` urgency and `role="status"` for `info`/`success`.
 * Follows `SKILL SEMI FLAT.md`: soft background + solid border/icon/title, while message text stays `#172554`.
 */
export function Alert({
  tone = 'info',
  title,
  action,
  onClose,
  role: roleProp,
  className,
  children,
  ...props
}: AlertProps) {
  const role =
    roleProp ?? (tone === 'danger' || tone === 'warning' ? 'alert' : 'status')

  return (
    <div
      {...props}
      role={role}
      className={[styles.alert, styles[tone], className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.iconWrap}>{getToneIcon(tone)}</span>
      <div className={styles.content}>
        {title ? <strong className={styles.title}>{title}</strong> : null}
        {children ? <div className={styles.message}>{children}</div> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
      {onClose ? (
        <button
          type="button"
          data-ds-button=""
          aria-label="Cerrar alerta"
          className={styles.dismissButton}
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

export type BannerProps = AlertProps

export function Banner({ className, ...props }: BannerProps) {
  return (
    <Alert
      {...props}
      className={[styles.banner, className].filter(Boolean).join(' ')}
    />
  )
}

export interface ToastEntry {
  id: string
  tone: FeedbackTone
  message: string
  title?: string
  durationMs?: number
}

export interface ToastInput {
  id?: string
  tone?: FeedbackTone
  message: string
  title?: string
  durationMs?: number
}

type ToastListener = (entries: readonly ToastEntry[]) => void

let toastQueue: ToastEntry[] = []
let toastCounter = 0
const listeners = new Set<ToastListener>()

function notifyListeners() {
  const snapshot = [...toastQueue]
  listeners.forEach((listener) => listener(snapshot))
}

function pushToast(input: ToastInput): string {
  toastCounter += 1
  const id = input.id ?? `toast-${toastCounter}`
  const entry: ToastEntry = {
    id,
    tone: input.tone ?? 'info',
    message: input.message,
    title: input.title,
    durationMs: input.durationMs ?? 5000,
  }
  toastQueue = [...toastQueue.filter((item) => item.id !== id), entry]
  notifyListeners()
  return id
}

export function dismissToast(id?: string): void {
  if (!id) {
    toastQueue = []
  } else {
    toastQueue = toastQueue.filter((item) => item.id !== id)
  }
  notifyListeners()
}

export function getActiveToasts(): readonly ToastEntry[] {
  return [...toastQueue]
}

/**
 * Global imperative `toast` dispatcher (`toast.success("...")`, `toast.error("...")`,
 * `toast.warning("...")`, `toast.info("...")`, `toast.dismiss(id)`).
 */
export const toast = {
  show: (input: ToastInput) => pushToast(input),
  info: (message: string, options?: Omit<ToastInput, 'message' | 'tone'>) =>
    pushToast({ ...options, message, tone: 'info' }),
  success: (message: string, options?: Omit<ToastInput, 'message' | 'tone'>) =>
    pushToast({ ...options, message, tone: 'success' }),
  warning: (message: string, options?: Omit<ToastInput, 'message' | 'tone'>) =>
    pushToast({ ...options, message, tone: 'warning' }),
  error: (message: string, options?: Omit<ToastInput, 'message' | 'tone'>) =>
    pushToast({ ...options, message, tone: 'danger' }),
  dismiss: (id?: string) => dismissToast(id),
}

export interface ToastContextValue {
  toasts: readonly ToastEntry[]
  toast: typeof toast
  dismiss: (id?: string) => void
}

const ToastContext =
  typeof createContext === 'function'
    ? createContext<ToastContextValue>({
        toasts: [],
        toast,
        dismiss: dismissToast,
      })
    : ({
        Provider: ({ children }: { children: ReactNode }) => children,
      } as unknown as Context<ToastContextValue>)

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}

export interface ToastItemProps {
  entry: ToastEntry
  onDismiss: (id: string) => void
}

export function Toast({ entry, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const duration = entry.durationMs ?? 5000
    if (duration <= 0 || typeof window === 'undefined') return
    const timer = window.setTimeout(() => {
      onDismiss(entry.id)
    }, duration)
    return () => window.clearTimeout(timer)
  }, [entry.id, entry.durationMs, onDismiss])

  const role =
    entry.tone === 'danger' || entry.tone === 'warning' ? 'alert' : 'status'

  return (
    <div
      role={role}
      className={[styles.toastItem, styles[entry.tone]]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.iconWrap}>{getToneIcon(entry.tone)}</span>
      <div className={styles.content}>
        {entry.title ? (
          <strong className={styles.title}>{entry.title}</strong>
        ) : null}
        <span className={styles.message}>{entry.message}</span>
      </div>
      <button
        type="button"
        data-ds-button=""
        aria-label="Cerrar notificación"
        className={styles.dismissButton}
        onClick={() => onDismiss(entry.id)}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

export interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [entries, setEntries] = useState<readonly ToastEntry[]>(() =>
    getActiveToasts(),
  )

  useEffect(() => {
    listeners.add(setEntries)
    return () => {
      listeners.delete(setEntries)
    }
  }, [])

  const handleDismiss = useCallback((id?: string) => {
    dismissToast(id)
  }, [])

  return (
    <ToastContext.Provider
      value={{ toasts: entries, toast, dismiss: handleDismiss }}
    >
      {children}
      {entries.length > 0 ? (
        <div className={styles.toastViewport} aria-live="polite">
          {entries.map((entry) => (
            <Toast key={entry.id} entry={entry} onDismiss={handleDismiss} />
          ))}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}
