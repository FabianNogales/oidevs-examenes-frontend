import { useCallback, useState } from 'react'
import { PortalHistory } from '@/features/portal-shared/components/PortalHistory'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import {
  PortalAdminCollection,
  type PortalRow,
} from '@/features/portal-shared/components/PortalAdminCollection'
import { PortalFeedback, PortalModal } from '@/features/portal-shared/components/PortalUi'
import { usePortalResource } from '@/features/portal-shared/hooks/usePortalResource'
import type { PortalQuery } from '@/features/portal-shared/api/portalApi'
import { getAdminService, listAdminServices } from '../api/servicesApi'
import { ServiceEditor } from '../components/ServiceEditor'
import type { AdminService, ServiceStatus } from '../types/services.types'
import styles from '@/features/portal-shared/components/portalShared.module.css'

const columns: readonly TableColumnDef<PortalRow<AdminService>>[] = [
  {
    id: 'name',
    header: 'Servicio',
    cell: ({ item }) => (
      <>
        <strong>{item.name}</strong>
        <p>{item.description}</p>
        {item.needs_review ? (
          <strong role="status">Requiere revisión</strong>
        ) : null}
      </>
    ),
  },
  {
    id: 'url',
    header: 'URL institucional',
    cell: ({ item }) => item.url,
  },
  {
    id: 'state',
    header: 'Estado',
    cell: ({ item }) => (item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'),
  },
  {
    id: 'order',
    header: 'Orden',
    cell: ({ item }) => item.display_order,
  },
]

function ServiceDialog({
  id,
  onClose,
  onSaved,
}: {
  id: number | null
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
    <PortalModal
      title={id === null ? 'Crear servicio' : 'Gestionar servicio'}
      onClose={onClose}
      busy={busy}
    >
      {id !== null ? <PortalHistory resource="services" id={id} /> : null}
      <PortalFeedback {...result} retry={result.reload} />
      {!result.loading && !result.error ? (
        <ServiceEditor
          initial={result.data}
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
  const [status, setStatus] = useState<ServiceStatus | ''>('')
  const [selected, setSelected] = useState<{ id: number | null } | null>(null)
  const load = useCallback(
    (query: PortalQuery, signal: AbortSignal) =>
      listAdminServices({ ...query, status }, signal),
    [status],
  )
  return (
    <>
      <PortalAdminCollection
        key={status}
        title="Gestión de servicios"
        searchPlaceholder="Buscar servicio"
        columns={columns}
        load={load}
        version={version}
        onSelect={(id) => setSelected({ id })}
        onCreate={() => setSelected({ id: null })}
      >
        <label className={styles.field}>
          Estado
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ServiceStatus | '')
            }
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </label>
      </PortalAdminCollection>
      {selected ? (
        <ServiceDialog
          key={selected.id ?? 'new'}
          id={selected.id}
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
