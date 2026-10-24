import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import { changeUserRole, getAdminUser, getUserRoles, roleLabel } from '../api/adminUsersApi'
import type { AdminUserItem, UserRoleItem } from '../api/adminUsersApi'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import styles from './AdminManageUsersPage.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'

export function AdminUserRolesPage() {
  const id = Number(useParams().userId)
  const { user, clearSession, notify } = useAuth()
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ id: number; account: AdminUserItem | null; roles: UserRoleItem[]; loading: boolean; error: string | null }>({ id, account: null, roles: [], loading: true, error: null })
  const [pending, setPending] = useState<(UserRoleItem & { userId: number }) | null>(null)
  const visible = state.id === id ? state : { account: null, roles: [], loading: true, error: null }
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    if (!Number.isSafeInteger(id) || id < 1) return
    Promise.all([getAdminUser(id, controller.signal), getUserRoles(id, controller.signal)]).then(([account, roles]) => {
      if (!controller.signal.aborted) setState({ id, account, roles, loading: false, error: null })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ id, account: null, roles: [], loading: false, error: error instanceof Error ? error.message : 'No se pudieron consultar los roles.' })
    })
    return () => controller.abort()
  }, [id, version])
  async function confirm() {
    if (!pending || pending.userId !== id || inFlight.current) return
    inFlight.current = true; setBusy(true)
    try {
      await changeUserRole(id, pending)
      notify('success', `Rol actualizado para la cuenta ${id}. Sus sesiones anteriores han sido revocadas.`)
      setPending(null)
      if (user?.id === id) { clearSession(); return }
      setState((current) => ({ ...current, loading: true })); setVersion((value) => value + 1)
    } catch (error) {
      setState((current) => current.id === id ? { ...current, error: error instanceof Error ? error.message : 'No se pudo modificar el rol.' } : current)
      setPending(null)
    } finally { inFlight.current = false; setBusy(false) }
  }
  const columns: readonly TableColumnDef<UserRoleItem>[] = [
    { id: 'name', header: 'Rol permanente', cell: (role) => roleLabel(role.name) },
    { id: 'assigned', header: 'Asignación actual', cell: (role) => role.assigned ? 'Asignado' : 'Sin asignación activa' },
    { id: 'actions', header: 'Acciones', cell: (role) => <button type="button" className={role.assigned ? tableStyles.btnDeactivate : tableStyles.btnActivate} disabled={busy || (!role.assigned && role.status !== 'ACTIVE') || (user?.id === id && role.name === 'ADMINISTRADOR' && role.assigned)} onClick={() => setPending({ ...role, userId: id })}>{role.assigned ? 'Retirar rol' : 'Asignar rol'}</button> },
  ]
  if (!Number.isSafeInteger(id) || id < 1) return <p role="alert">El identificador de cuenta no es válido.</p>
  return <section className={styles.pageContainer}>
    <Link to="/admin/users/roles">Volver a roles y permisos</Link>
    <header className={styles.pageHeader}><div className={styles.headerTitles}><h1>Gestionar roles y permisos</h1>
      <p>{visible.account?.full_name ?? 'Cuenta seleccionada'} · HU22</p>
      <p>La asignación requiere el perfil académico correspondiente. La colaboración temporal se gestiona por examen. Todo cambio revoca las sesiones anteriores.</p>
    </div></header>
    <DataTable columns={columns} data={visible.roles} loading={visible.loading} error={visible.error} entityLabel="roles"
      onRetry={() => { setState((current) => ({ ...current, loading: true, error: null })); setVersion((value) => value + 1) }} />
    <ConfirmDialog isOpen={pending?.userId === id} title={pending?.assigned ? 'Retirar rol permanente' : 'Asignar rol permanente'}
      message={`${pending?.assigned ? 'Retirar' : 'Asignar'} ${pending ? roleLabel(pending.name) : ''} a esta cuenta. Se conservarán sus datos e historial y deberá iniciar sesión nuevamente.`}
      loading={busy} onConfirm={() => void confirm()} onCancel={() => { if (!busy) setPending(null) }} />
  </section>
}
