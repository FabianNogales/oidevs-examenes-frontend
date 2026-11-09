import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import type { PortalPage, portalError } from '../api/portalApi'
import styles from './portalShared.module.css'
import {
  PortalDialog,
  type PortalDialogProps,
} from '@/shared/components/PortalDialog/PortalDialog'

/** Compatibility adapter preserving the portal's existing style hooks. */
export function PortalModal(props: PortalDialogProps) {
  return (
    <PortalDialog
      {...props}
      className={`${styles.dialog} ${props.drawer ? styles.drawer : ''} ${props.className ?? ''}`}
      headerClassName={`${styles.dialogHeader} ${props.headerClassName ?? ''}`}
      bodyClassName={`${props.drawer ? styles.drawerBody : ''} ${props.bodyClassName ?? ''}`}
    />
  )
}

export function PortalPageLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  // R3: public details share the reading width (960px) and header of the public lists. The body keeps
  // portalBase .page for its descendant styles (buttons, focus); PageContainer owns the padding.
  return (
    <main>
      <PageContainer width="narrow">
        <PageHeader
          title={title}
          breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: title }]}
        />
        <div className={`${styles.page} ${styles.portalPageBody}`}>
          {children}
        </div>
      </PageContainer>
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
