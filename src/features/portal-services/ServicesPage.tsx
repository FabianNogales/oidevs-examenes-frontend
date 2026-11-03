import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  PortalFeedback,
  PortalPageLayout,
  PortalPager,
} from '@/features/portal-shared/PortalUi'
import { usePortalResource } from '@/features/portal-shared/usePortalResource'
import { getService, listServices, serviceCategories } from './servicesApi'
import { ServiceCard } from './ServiceCard'
import styles from '@/features/portal-shared/portalShared.module.css'

export function ServicesPage() {
  const [query, setQuery] = useState({ page: 1, search: '', category: '' })
  const [search, setSearch] = useState('')
  const loadCategories = useCallback(
    (signal: AbortSignal) => serviceCategories(false, signal),
    [],
  )
  const categories = usePortalResource(loadCategories)
  const load = useCallback(
    (signal: AbortSignal) =>
      listServices(
        {
          page: query.page,
          search: query.search,
          per_page: 12,
          ...(query.category ? { category_id: Number(query.category) } : {}),
        },
        signal,
      ),
    [query],
  )
  const result = usePortalResource(load)
  return (
    <PortalPageLayout title="Servicios institucionales">
      <form
        className={styles.toolbar}
        onSubmit={(event) => {
          event.preventDefault()
          setQuery({ ...query, page: 1, search: search.trim() })
        }}
      >
        <label className={styles.field}>
          Buscar servicios
          <input
            type="search"
            maxLength={200}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button type="submit">Buscar</button>
      </form>
      <PortalFeedback {...categories} retry={categories.reload} />
      {categories.data?.length ? (
        <label className={styles.field}>
          Categoría
          <select
            value={query.category}
            onChange={(event) =>
              setQuery({ ...query, page: 1, category: event.target.value })
            }
          >
            <option value="">Todas las categorías</option>
            {categories.data.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      ) : categories.data ? (
        <p className={styles.muted}>
          No hay categorías de servicios disponibles.
        </p>
      ) : null}
      <PortalFeedback {...result} retry={result.reload} />
      {result.data?.data.length === 0 ? (
        <p role="status">No hay servicios disponibles para esta consulta.</p>
      ) : null}
      <div className={styles.cards}>
        {result.data?.data.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
      {result.data ? (
        <PortalPager
          meta={result.data.meta}
          onPage={(page) => setQuery({ ...query, page })}
        />
      ) : null}
    </PortalPageLayout>
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
      <PortalFeedback {...result} retry={result.reload} />
      {result.data ? <ServiceCard service={result.data} detail /> : null}
    </PortalPageLayout>
  )
}
