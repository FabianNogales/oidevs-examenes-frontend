import { useEffect, useState } from 'react'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import { eventLabel, getAccountHistory, roleLabel } from '../api/adminUsersApi'
import type { AccountEvent, ReadPage } from '../api/adminUsersApi'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import styles from './AdminManageUsersPage.module.css'

const columns: readonly TableColumnDef<AccountEvent>[] = [
  { id: 'date', header: 'Fecha y hora', cell: (item) => item.created_at ? new Date(item.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }) : 'No registrada' },
  { id: 'target', header: 'Cuenta (ID)', accessorKey: 'user_id' },
  { id: 'actor', header: 'Responsable', cell: (item) => item.actor_name ?? `ID ${item.actor_id ?? 'no registrado'}` },
  { id: 'action', header: 'Acción', cell: (item) => eventLabel(item.action) },
  { id: 'result', header: 'Cambio registrado', cell: (item) => typeof item.new_context.role === 'string'
    ? roleLabel(item.new_context.role) : `${item.old_context.status ?? '—'} → ${item.new_context.status ?? '—'}` },
]
export function AdminUserHistoryPage() {
  const [query, setQuery] = useState({ page: 1, search: '', version: 0 })
  const [state, setState] = useState<{ result: ReadPage<AccountEvent> | null; loading: boolean; error: string | null }>({ result: null, loading: true, error: null })
  useEffect(() => {
    const controller = new AbortController()
    getAccountHistory(query.page, query.search, controller.signal).then((result) => {
      if (!controller.signal.aborted) setState({ result, loading: false, error: null })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ result: null, loading: false, error: error instanceof Error ? error.message : 'No se pudo consultar el historial.' })
    })
    return () => controller.abort()
  }, [query])
  function change(next: typeof query) { setState({ result: null, loading: true, error: null }); setQuery(next) }
  const meta = state.result?.meta
  return <section className={styles.pageContainer}>
    <header className={styles.pageHeader}><div className={styles.headerTitles}><h1>Historial de usuarios y roles</h1>
      <p>Eventos persistidos de cuentas y roles. No se reconstruyen cambios anteriores sin auditoría; el nombre del responsable corresponde a su perfil actual.</p>
    </div></header>
    <DataTable columns={columns} data={state.result?.data ?? []} loading={state.loading} error={state.error}
      entityLabel="eventos" pagination={meta ? { currentPage: meta.current_page, lastPage: meta.last_page, total: meta.total, from: meta.from, to: meta.to } : null}
      onSearch={(search) => change({ page: 1, search, version: query.version + 1 })} searchPlaceholder="Buscar por ID de cuenta, acción o responsable"
      onPageChange={(page) => change({ ...query, page })} onRetry={() => change({ ...query, version: query.version + 1 })}
      emptyTitle="Sin eventos registrados" emptyDescription="No hay eventos conservados para esta consulta." />
  </section>
}
