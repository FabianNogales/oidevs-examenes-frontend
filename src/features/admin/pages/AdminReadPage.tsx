import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { BaseTableEntity, TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { listAuditEvents, readAuditEvent, listCareers, readCareer } from '@/features/admin/api/adminReadApi'
import type { AuditEvent, Career, ReadPage as PageResult, ReadQuery } from '@/features/admin/api/adminReadApi'
import styles from './AdminManageStudentsPage.module.css'

function ReadPage<T extends BaseTableEntity & { id: number }>({ title, label, columns, list, detail, renderDetail, searchable = false, children }: {
  title: string; label: string; columns: readonly TableColumnDef<T>[]; list: (query: ReadQuery, signal: AbortSignal) => Promise<PageResult<T>>;
  detail: (id: number, signal: AbortSignal) => Promise<T>; renderDetail: (entry: T) => ReactNode; searchable?: boolean; children?: ReactNode;
}) {
  const [query, setQuery] = useState({ page: 1, search: '', version: 0 })
  const key = JSON.stringify(query)
  const [result, setResult] = useState<{ key: string; value: PageResult<T> | null; error: string | null }>({ key: '', value: null, error: null })
  const [selected, setSelected] = useState<{ open: boolean; value: T | null; error: string | null }>({ open: false, value: null, error: null })
  const activeDetail = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    list(query, controller.signal).then((value) => {
      if (!controller.signal.aborted) setResult({ key, value, error: null })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, value: null, error: 'No se pudo cargar la información. Verifica tu acceso y vuelve a intentar.' })
    })
    return () => controller.abort()
  }, [key, query, list])
  useEffect(() => () => activeDetail.current?.abort(), [])

  function closeDetail() { activeDetail.current?.abort(); setSelected({ open: false, value: null, error: null }) }
  async function openDetail(item: T) {
    activeDetail.current?.abort()
    const controller = new AbortController(); activeDetail.current = controller
    setSelected({ open: true, value: null, error: null })
    try {
      const value = await detail(item.id, controller.signal)
      if (!controller.signal.aborted) setSelected({ open: true, value, error: null })
    } catch (cause) {
      if (!controller.signal.aborted) setSelected({ open: true, value: null, error: cause instanceof Error ? cause.message : 'No se pudo cargar el detalle.' })
    }
  }
  const loading = result.key !== key
  return <div className={styles.pageContainer}>
    <header className={styles.pageHeader}><div className={styles.headerTitles}><h1>{title}</h1>{children}</div></header>
    <DataTable<T> columns={columns} data={loading ? [] : result.value?.data ?? []} loading={loading}
      viewActionLabel="Ver detalle"
      error={loading ? null : result.error} entityLabel={label}
      pagination={loading || !result.value ? null : { currentPage: result.value.meta.current_page, lastPage: result.value.meta.last_page,
        total: result.value.meta.total, from: result.value.meta.from, to: result.value.meta.to }}
      onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
      onSearch={searchable ? (search) => setQuery((current) => ({ ...current, page: 1, search, version: current.version + 1 })) : undefined}
      searchPlaceholder="Buscar por código o nombre"
      onRetry={() => setQuery((current) => ({ ...current, version: current.version + 1 }))}
      onViewProfile={(item) => void openDetail(item)} emptyTitle={`No se encontraron ${label}`} emptyDescription="No hay registros para esta consulta." />
    {selected.open && <CollaborationModal title="Detalle del registro" onClose={closeDetail}>
      {selected.error ? <p role="alert">{selected.error}</p> : selected.value ? renderDetail(selected.value) : <p role="status">Cargando detalle…</p>}
    </CollaborationModal>}
  </div>
}

const careerColumns: readonly TableColumnDef<Career>[] = [
  { id: 'code', header: 'Código', accessorKey: 'code' }, { id: 'name', header: 'Carrera', accessorKey: 'name' },
  { id: 'status', header: 'Estado', accessorKey: 'status' },
]
const auditColumns: readonly TableColumnDef<AuditEvent>[] = [
  { id: 'id', header: 'Evento', accessorKey: 'id' }, { id: 'actor', header: 'Actor (ID)', cell: (row) => row.actor_id ?? 'No registrado' },
  { id: 'action', header: 'Acción', accessorKey: 'action' }, { id: 'entity', header: 'Entidad', cell: (row) => `${row.entity_type} · ${row.entity_id ?? 'Sin ID individual'}` },
  { id: 'date', header: 'Fecha', cell: (row) => row.created_at ? new Date(row.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }) : 'No registrada' },
]

export function AdminReadPage({ kind }: { kind: 'careers' | 'audit-logs' }) {
  return kind === 'careers' ? <ReadPage<Career> title="Carreras" label="carreras" columns={careerColumns} list={listCareers} detail={readCareer} searchable
    renderDetail={(row) => <dl><dt>Código</dt><dd>{row.code}</dd><dt>Nombre</dt><dd>{row.name}</dd><dt>Estado</dt><dd>{row.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}</dd></dl>}>
    <p>Consulta del catálogo. Incluye carreras activas e inactivas.</p>
  </ReadPage> : <ReadPage<AuditEvent> title="Auditoría" label="eventos" columns={auditColumns} list={listAuditEvents} detail={readAuditEvent}
    renderDetail={(row) => <><dl><dt>Evento</dt><dd>{row.id}</dd><dt>Actor (ID)</dt><dd>{row.actor_id ?? 'No registrado'}</dd>
      <dt>Acción</dt><dd>{row.action}</dd><dt>Entidad</dt><dd>{row.entity_type} · {row.entity_id ?? 'Sin ID individual'}</dd>
      <dt>Fecha</dt><dd>{row.created_at ? new Date(row.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }) : 'No registrada'}</dd></dl>
      <h3>Contexto anterior permitido</h3><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(row.old_context, null, 2)}</pre>
      <h3>Contexto nuevo permitido</h3><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(row.new_context, null, 2)}</pre></>}>
    <p>El total cuenta eventos. WRITE/Exam y CREATE/Exam pueden describir la misma programación; no representan dos exámenes creados.</p>
  </ReadPage>
}
