import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  PortalFeedback,
  PortalPageLayout,
  PortalPager,
} from '@/features/portal-shared/components/PortalUi'
import { usePortalResource } from '@/features/portal-shared/hooks/usePortalResource'
import { getService, listServices } from '../api/servicesApi'
import { ServiceCard } from '../components/ServiceCard'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import servicesStyles from './ServicesPage.module.css'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'

const publicLoadError =
  'No fue posible cargar los servicios institucionales. Intenta nuevamente.'

export function ServicesPage() {
  const [page, setPage] = useState(1)
  const load = useCallback(
    (signal: AbortSignal) =>
      listServices(
        {
          page,
          per_page: 12,
        },
        signal,
      ),
    [page],
  )
  const result = usePortalResource(load)
  return (
    <main className={styles.servicesPage}>
      <PageContainer width="narrow">
        <PageHeader
          title="Servicios institucionales"
          breadcrumbs={[
            { label: 'Inicio', to: '/' },
            { label: 'Servicios institucionales' },
          ]}
        />
        <div className={`${styles.page} ${servicesStyles.pageBody}`}>
          <PortalFeedback
            loading={result.loading}
            error={
              result.error ? { ...result.error, message: publicLoadError } : null
            }
            retry={result.reload}
          />
          {result.data?.data.length === 0 ? (
            <p className={styles.servicesEmpty} role="status">
              No hay servicios disponibles actualmente.
            </p>
          ) : null}
          {result.data?.data.length ? (
            <p className={styles.servicesIntro}>
              Accede a los servicios y plataformas oficiales de la Universidad
              Mayor de San Simón.
            </p>
          ) : null}
          <div className={styles.serviceCards}>
            {result.data?.data.map((service) => (
              <ServiceCard key={service.id} service={service} horizontal />
            ))}
          </div>
          {result.data && result.data.meta.last_page > 1 ? (
            <PortalPager meta={result.data.meta} onPage={setPage} />
          ) : null}
        </div>
      </PageContainer>
    </main>
  )
}

export function ServiceDetailPage() {
  const { serviceId } = useParams()
  const load = useCallback(
    (signal: AbortSignal) => getService(Number(serviceId), signal),
    [serviceId],
  )
  const result = usePortalResource(load)
  return (
    <PortalPageLayout title="Detalle de servicio">
      <Link to="/services">Volver a servicios</Link>
      <PortalFeedback
        loading={result.loading}
        error={
          result.error ? { ...result.error, message: publicLoadError } : null
        }
        retry={result.reload}
      />
      {result.data ? <ServiceCard service={result.data} detail /> : null}
    </PortalPageLayout>
  )
}
