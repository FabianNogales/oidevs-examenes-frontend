import { useCallback, useId, useRef, useState } from 'react'
import { AdminStatusBadge } from '@/features/portal-shared/components/AdminStatusBadge'
import { PortalHistory } from '@/features/portal-shared/components/PortalHistory'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import {
  PortalAdminCollection,
  type PortalRow,
} from '@/features/portal-shared/components/PortalAdminCollection'
import { PortalFeedback, PortalModal } from '@/features/portal-shared/components/PortalUi'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'
import { usePortalResource } from '@/features/portal-shared/hooks/usePortalResource'
import type { PortalQuery } from '@/features/portal-shared/api/portalApi'
import { getAdminService, listAdminServices } from '../api/servicesApi'
import { ServiceEditor } from '../components/ServiceEditor'
import type { AdminService, ServiceStatus } from '../types/services.types'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import adminStyles from './adminServices.module.css'

const columns: readonly TableColumnDef<PortalRow<AdminService>>[] = [
  {
    id: 'name',
    header: 'Servicio',
    // A single container keeps the content in the value column of the mobile card grid.
    cell: ({ item }) => (
      <div>
        <strong>{item.name}</strong>
        <p>{item.description}</p>
        {item.needs_review ? <strong>Requiere revisión</strong> : null}
      </div>
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
    cell: ({ item }) => <AdminStatusBadge status={item.status} />,
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
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [editorState, setEditorState] = useState({
    label: id === null ? 'Crear servicio inactivo' : 'Guardar servicio',
    disabled: true,
    pending: false,
  })
  const formId = useId()
  const requestClose = () => {
    if (busy) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }
  const load = useCallback(
    (signal: AbortSignal) =>
      id === null ? Promise.resolve(null) : getAdminService(id, signal),
    [id],
  )
  const result = usePortalResource(load)
  return (
    <PortalModal
      drawer
      title={id === null ? 'Crear servicio' : 'Gestionar servicio'}
      busy={busy}
      closeBlocked={confirmClose || editorState.pending}
      onClose={requestClose}
      footer={
        <>
          <button type="button" disabled={busy} onClick={requestClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form={formId}
            className={styles.primary}
            disabled={busy || editorState.disabled}
          >
            {editorState.label}
          </button>
        </>
      }
    >
      {id !== null ? <PortalHistory resource="services" id={id} /> : null}
      <PortalFeedback {...result} retry={result.reload} />
      {!result.loading && !result.error ? (
        <ServiceEditor
          formId={formId}
          initial={result.data}
          onBusy={setBusy}
          onDirty={setDirty}
          onStateChange={setEditorState}
          onSaved={onSaved}
        />
      ) : null}
      <ConfirmDialog
        native
        isOpen={confirmClose}
        title="¿Descartar los cambios?"
        message="La información que no hayas guardado se perderá."
        cancelLabel="Seguir editando"
        confirmLabel="Descartar cambios"
        variant="danger"
        onCancel={() => setConfirmClose(false)}
        onConfirm={onClose}
      />
    </PortalModal>
  )
}

export function AdminServicesPage() {
  const { notify } = useAuth()
  const [version, setVersion] = useState(0)
  const [status, setStatus] = useState<ServiceStatus | ''>('')
  const statusSelect = useRef<HTMLSelectElement>(null)
  const [selected, setSelected] = useState<{ id: number | null } | null>(null)
  const load = useCallback(
    (query: PortalQuery, signal: AbortSignal) =>
      listAdminServices({ ...query, status }, signal),
    [status],
  )
  return (
    <PageContainer>
      <PortalAdminCollection
        headerVariant="page"
        resetPageKey={status}
        title="Gestión de servicios"
        description="Administra los servicios y enlaces institucionales."
        className={adminStyles.servicesAdminPage}
        searchPlaceholder="Buscar servicios"
        createLabel="Crear servicio"
        columns={columns}
        load={load}
        version={version}
        onSelect={(id) => setSelected({ id })}
        onCreate={() => setSelected({ id: null })}
        filterLayout="inline"
        filters={
          <>
            <label className={`${styles.field} ${adminStyles.statusFilter}`}>
              Estado
              <select
                ref={statusSelect}
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
            {/* Clears only the filter; the search keeps DataTable's own "Limpiar". */}
            {status ? (
              <button
                type="button"
                className={adminStyles.clearFilters}
                onClick={() => {
                  setStatus('')
                  // The button disappears: keep focus on the reset filter.
                  statusSelect.current?.focus()
                }}
              >
                Limpiar filtros
              </button>
            ) : null}
          </>
        }
      />
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
    </PageContainer>
  )
}
