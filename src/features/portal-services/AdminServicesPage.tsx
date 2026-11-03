import { useCallback, useState } from 'react'
import { PortalHistory } from '@/features/portal-shared/PortalHistory'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import {
  PortalAdminCollection,
  type PortalRow,
} from '@/features/portal-shared/PortalAdminCollection'
import { PortalFeedback, PortalModal } from '@/features/portal-shared/PortalUi'
import { usePortalResource } from '@/features/portal-shared/usePortalResource'
import type { PortalQuery } from '@/features/portal-shared/portalApi'
import {
  getAdminService,
  listAdminServices,
  serviceCategories,
  serviceOptions,
} from './servicesApi'
import { ServiceEditor } from './ServiceEditor'
import type {
  AdminService,
  ServiceCategory,
  ServiceOptions,
  ServiceStatus,
} from './types'
import styles from '@/features/portal-shared/portalShared.module.css'

const columns: readonly TableColumnDef<PortalRow<AdminService>>[] = [
  { id: 'name', header: 'Servicio', cell: ({ item }) => item.name },
  {
    id: 'category',
    header: 'Categoría',
    cell: ({ item }) => item.category.name,
  },
  {
    id: 'state',
    header: 'Estado',
    cell: ({ item }) => (item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'),
  },
  {
    id: 'destination',
    header: 'Destino',
    cell: ({ item }) => item.destination,
  },
]
function ServiceDialog({
  id,
  categories,
  options,
  onClose,
  onSaved,
}: {
  id: number | null
  categories: ServiceCategory[]
  options: ServiceOptions
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const load = useCallback(
    (signal: AbortSignal) =>
      id === null ? Promise.resolve(null) : getAdminService(id, signal),
    [id],
  )
  const result = usePortalResource(load)
  return (
    <PortalModal title="Gestionar servicio" onClose={onClose} busy={busy}>
      {id !== null ? <PortalHistory resource="services" id={id} /> : null}
      <PortalFeedback {...result} retry={result.reload} />
      {!result.loading && !result.error ? (
        <ServiceEditor
          initial={result.data}
          categories={categories}
          options={options}
          onBusy={setBusy}
          onSaved={onSaved}
        />
      ) : null}
    </PortalModal>
  )
}

export function AdminServicesPage() {
  const { notify } = useAuth()
  const [version, setVersion] = useState(0)
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<{ id: number | null } | null>(null)
  const loadCategories = useCallback(
    (signal: AbortSignal) => serviceCategories(true, signal),
    [],
  )
  const categories = usePortalResource(loadCategories)
  const loadOptions = useCallback(
    (signal: AbortSignal) => serviceOptions(signal),
    [],
  )
  const options = usePortalResource(loadOptions)
  const load = useCallback(
    (query: PortalQuery, signal: AbortSignal) =>
      listAdminServices(
        { ...query, ...(status ? { status: status as ServiceStatus } : {}) },
        signal,
      ),
    [status],
  )
  return (
    <>
      <PortalAdminCollection
        key={status}
        title="Gestión de servicios"
        columns={columns}
        load={load}
        version={version}
        createDisabled={
          !categories.data?.length || !options.data?.icon_keys.length
        }
        onSelect={(id) => setSelected({ id })}
        onCreate={() => setSelected({ id: null })}
      >
        <PortalFeedback {...categories} retry={categories.reload} />
        <PortalFeedback {...options} retry={options.reload} />
        {categories.data?.length === 0 ? (
          <p role="status">No hay categorías de servicios disponibles.</p>
        ) : null}
        {options.data?.internal_destinations.length === 0 ? (
          <p>No hay destinos internos disponibles en service-options.</p>
        ) : null}
        <label className={styles.field}>
          Estado
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </select>
        </label>
      </PortalAdminCollection>
      {selected && options.data ? (
        <ServiceDialog
          key={selected.id ?? 'new'}
          id={selected.id}
          categories={categories.data ?? []}
          options={options.data}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setVersion((current) => current + 1)
            notify('success', 'El servicio fue guardado.')
          }}
        />
      ) : null}
    </>
  )
}
