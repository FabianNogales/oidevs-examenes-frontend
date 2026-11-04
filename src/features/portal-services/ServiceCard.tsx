import { Link } from 'react-router'
import type { PortalService } from './types'
import styles from '@/features/portal-shared/portalShared.module.css'

function ExternalLinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14 4h6v6m0-6-9 9" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  )
}

function ServiceIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1M10 21v-4h4v4" />
    </svg>
  )
}

export function ServiceDestination({
  service,
  horizontal = false,
}: {
  service: PortalService
  horizontal?: boolean
}) {
  return (
    <a
      className={styles.serviceAction}
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {horizontal ? (
        <>
          Abrir servicio <ExternalLinkIcon />
        </>
      ) : (
        <>
          Acceder al servicio <span aria-hidden="true">→</span>
        </>
      )}
    </a>
  )
}

export function ServiceCard({
  service,
  detail = false,
  horizontal = false,
}: {
  service: PortalService
  detail?: boolean
  horizontal?: boolean
}) {
  return (
    <article
      className={`${styles.serviceCard} ${horizontal ? styles.serviceCardHorizontal : ''}`}
    >
      <span className={styles.serviceIcon}>
        {horizontal ? <ServiceIcon /> : <ExternalLinkIcon />}
      </span>
      <div className={styles.serviceContent}>
        <h2 className={styles.serviceTitle}>
          {detail ? (
            service.name
          ) : (
            <Link to={`/services/${service.id}`}>{service.name}</Link>
          )}
        </h2>
        <p className={styles.serviceDescription}>{service.description}</p>
        {horizontal ? (
          <p className={styles.serviceDomain}>
            {new URL(service.url).hostname}
          </p>
        ) : null}
      </div>
      <ServiceDestination service={service} horizontal={horizontal} />
    </article>
  )
}
