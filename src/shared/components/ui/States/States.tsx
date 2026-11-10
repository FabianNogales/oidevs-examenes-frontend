import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { AlertCircle, Inbox } from 'lucide-react'
import { Button } from '../Button/Button'
import { Spinner } from '../Spinner/Spinner'
import styles from './States.module.css'

export interface LoadingStateProps {
  /** Primary title announced while loading. */
  title?: string
  /** Optional secondary description. */
  description?: string
  className?: string
}

/**
 * Global LoadingState / Loading utility component:
 * Uniform loading presentation across the app (`role="status"`, `aria-live="polite"`).
 */
export function LoadingState({
  title = 'Cargando información…',
  description,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[styles.stateContainer, className].filter(Boolean).join(' ')}
    >
      <Spinner size="lg" />
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
  )
}

export const Loading = LoadingState

export interface EmptyStateProps {
  /** Primary empty state heading. */
  title?: string
  /** Explanatory secondary message. */
  description?: ReactNode
  /** Optional custom icon (defaults to `Inbox`). */
  icon?: ReactNode
  /** Optional call-to-action slot (e.g., a Button to create or clear filters). */
  action?: ReactNode
  className?: string
}

/**
 * Global EmptyState utility component:
 * Uniform empty state presentation across the app.
 */
export function EmptyState({
  title = 'No hay datos disponibles',
  description = 'Aún no se han registrado elementos para mostrar en esta sección.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[styles.stateContainer, className].filter(Boolean).join(' ')}
    >
      <span className={styles.iconCircle} aria-hidden="true">
        {icon ?? <Inbox size={24} aria-hidden="true" />}
      </span>
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.actions}>{action}</div> : null}
    </div>
  )
}

export interface ErrorStateProps {
  /** Error state heading. */
  title?: string
  /** Detailed error description. */
  description?: ReactNode
  /** Optional retry callback. Renders a "Reintentar" primary button when provided. */
  onRetry?: () => void
  /** Custom label for the retry button. */
  retryLabel?: string
  /** Optional extra action slot. */
  action?: ReactNode
  className?: string
}

/**
 * Global ErrorState utility component:
 * Uniform error presentation across the app (`role="alert"`).
 */
export function ErrorState({
  title = 'No se pudo cargar la información',
  description = 'Ocurrió un problema al procesar la solicitud. Por favor, inténtalo nuevamente.',
  onRetry,
  retryLabel = 'Reintentar',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={[
        styles.stateContainer,
        styles.errorContainer,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={[styles.iconCircle, styles.errorIconCircle].join(' ')}
        aria-hidden="true"
      >
        <AlertCircle size={24} aria-hidden="true" />
      </span>
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {onRetry || action ? (
        <div className={styles.actions}>
          {onRetry ? (
            <Button type="button" variant="primary" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  )
}

export interface ErrorBoundaryFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional custom fallback element or render function. Defaults to `<ErrorState />`. */
  fallback?:
    | ReactNode
    | ((props: ErrorBoundaryFallbackProps) => ReactNode)
  /** Optional callback invoked when an error is caught. */
  onError?: (error: Error, info: ErrorInfo) => void
  /** Optional callback invoked when the user resets the boundary. */
  onReset?: () => void
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Global ErrorBoundary utility component:
 * Catches rendering errors in its subtree and displays a uniform `ErrorState` or custom fallback.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error) {
      if (typeof fallback === 'function') {
        return fallback({
          error,
          resetErrorBoundary: this.resetErrorBoundary,
        })
      }
      if (fallback !== undefined) {
        return fallback
      }
      return (
        <ErrorState
          title="Algo salió mal"
          description={error.message || 'Error inesperado en la aplicación.'}
          onRetry={this.resetErrorBoundary}
        />
      )
    }

    return children
  }
}
