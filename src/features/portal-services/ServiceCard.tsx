import { Link } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AUTH_ROUTES } from '@/features/auth/utils/authRoutes'
import { UiIcon } from '@/assets/icons/UiIcon'
import type { PortalService } from './types'
import styles from '@/features/portal-shared/portalShared.module.css'

export function ServiceIcon({ iconKey }: { iconKey: string }) {
  // Rendering geometry only. Allowed choices always come from service-options.
  if (iconKey === 'calendar' || iconKey === 'info')
    return <UiIcon name={iconKey} />
  const geometry: Record<string, string> = {
    book: 'M12 5v16M12 5C9 2 5 3 3 4v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-3-1-6-2-9 1Z',
    link: 'm9 15 6-6M8 17l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m4 0 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
    users:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M13 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  }
  return geometry[iconKey] ? (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={geometry[iconKey]} />
    </svg>
  ) : (
    <UiIcon name="info" />
  )
}

export function ServiceDestination({ service }: { service: PortalService }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (service.requires_auth && isLoading)
    return <p role="status">Verificando sesión…</p>
  if (service.requires_auth && !isAuthenticated)
    return <Link to={AUTH_ROUTES.login}>Iniciar sesión para acceder</Link>
  return service.destination_type === 'INTERNAL' ? (
    <Link to={service.destination}>Acceder al servicio</Link>
  ) : (
    <a href={service.destination} target="_blank" rel="noopener noreferrer">
      Acceder al servicio
    </a>
  )
}

export function ServiceCard({
  service,
  detail = false,
}: {
  service: PortalService
  detail?: boolean
}) {
  return (
    <article className={styles.card}>
      <span className={styles.icon}>
        <ServiceIcon iconKey={service.icon_key} />
      </span>
      <h2>
        {detail ? (
          service.name
        ) : (
          <Link to={`/services/${service.id}`}>{service.name}</Link>
        )}
      </h2>
      <p className={styles.description}>{service.description}</p>
      <p>{service.category.name}</p>
      {service.requires_auth ? (
        <p className={styles.muted}>
          Requiere iniciar sesión. El módulo de destino verifica tus permisos.
        </p>
      ) : null}
      <ServiceDestination service={service} />
    </article>
  )
}
