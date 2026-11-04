import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import type { PortalPage, portalError } from './portalApi'
import styles from './portalShared.module.css'

export { CalendarModal as PortalModal } from '@/features/portal-calendar/components/CalendarModal'

export function PortalPageLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className={`${styles.publicPage} ${styles.page}`}>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: title }]} />
      <h1>{title}</h1>
      {children}
    </main>
  )
}

export function PortalFeedback({
  loading,
  error,
  retry,
}: {
  loading: boolean
  error: ReturnType<typeof portalError> | null
  retry: () => void
}) {
  return loading ? (
    <p role="status">Cargando contenido…</p>
  ) : error ? (
    <div role="alert" className={styles.error}>
      <p>{error.message}</p>
      <button type="button" onClick={retry}>
        Reintentar
      </button>
    </div>
  ) : null
}

export function PortalPager({
  meta,
  onPage,
}: {
  meta: PortalPage<unknown>['meta']
  onPage: (page: number) => void
}) {
  return (
    <nav className={styles.toolbar} aria-label="Paginación">
      <p>
        {meta.total} registros · Página {meta.current_page} de {meta.last_page}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          disabled={meta.current_page <= 1}
          onClick={() => onPage(meta.current_page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => onPage(meta.current_page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}

export function EditorFeedback({
  error,
  conflict,
  busy,
  onRefresh,
}: {
  error: ReturnType<typeof portalError> | null
  conflict: boolean
  busy: boolean
  onRefresh: () => void
}) {
  return (
    <>
      {error ? (
        <div role="alert" className={styles.error}>
          <p>{error.message}</p>
          {Object.entries(error.fields)
            .filter(([, message]) => message !== error.message)
            .map(([field, message]) => (
              <p key={field}>{message}</p>
            ))}
        </div>
      ) : null}
      {conflict ? (
        <div className={styles.notice}>
          <p>
            Se conservan tus cambios. Recargar reemplazará el formulario con los
            datos actuales del servidor.
          </p>
          <button type="button" disabled={busy} onClick={onRefresh}>
            Recargar y descartar cambios
          </button>
        </div>
      ) : null}
    </>
  )
}

export function PortalField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className={styles.field}>
      {label}
      {children}
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  )
}

export function ContentLink({
  url,
  children,
}: {
  url: string
  children: ReactNode
}) {
  return url.startsWith('/') ? (
    <Link to={url}>{children}</Link>
  ) : (
    <a href={url}>{children}</a>
  )
}
