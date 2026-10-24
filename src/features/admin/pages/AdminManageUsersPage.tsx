import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { AdminUserHistoryPage } from './AdminUserHistoryPage'

import { ConfirmDialog } from '@/features/admin/components/ConfirmDialog'
import {
  getAdminUsers,
  getAdminUser,
  updateAdminUserStatus,
  type AdminUserItem,
} from '@/features/admin/api/adminUsersApi'

import { DataTable } from '@/shared/components/DataTable/DataTable'
import type {
  TableColumnDef,
  TablePaginationMeta,
} from '@/shared/components/DataTable/dataTable.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'

import styles from './AdminManageUsersPage.module.css'

const PER_PAGE = 10

/**
 * Contrato declarativo de columnas y anchos para la tabla de Usuarios.
 * Incluye Código, Usuario (con CI), Correo Institucional, Rol actual y Estado.
 */
const USER_COLUMNS: readonly TableColumnDef<AdminUserItem>[] = [
  {
    id: 'code',
    header: 'Código',
    width: '14%',
    accessorKey: 'institutional_code',
  },
  {
    id: 'user',
    header: 'Usuario',
    width: '25%',
    cell: (user) => (
      <div>
        <span className={tableStyles.primaryText}>
          {user.last_names || user.first_names ? `${user.last_names} ${user.first_names}` : user.full_name}
        </span>
        {user.identity_number && (
          <span className={tableStyles.secondaryText}>
            CI: {user.identity_number}
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'email',
    header: 'Correo Institucional',
    width: '26%',
    accessorKey: 'email',
  },
  {
    id: 'role',
    header: 'Rol actual',
    width: '14%',
    cell: (user) => (
      <span className={styles.roleLabel}>{user.role_label}</span>
    ),
  },
  {
    id: 'status',
    header: 'Estado',
    width: '11%',
    accessorKey: 'status',
  },
]

export function AdminManageUsersPage() {
  const path = useLocation().pathname
  return path === '/admin/users/history' ? <AdminUserHistoryPage /> : <ManageAccounts rolesView={path === '/admin/users/roles'} />
}

export function ManageAccounts({ rolesView = false }: { rolesView?: boolean } = {}) {
  const { user: currentUser, notify } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [pagination, setPagination] = useState<TablePaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Estados para el cuadro de diálogo de confirmación de Activar/Desactivar
  const [pendingToggle, setPendingToggle] = useState<AdminUserItem | null>(null)
  const [toggling, setToggling] = useState(false)

  const [detail, setDetail] = useState<{ open: boolean; account: AdminUserItem | null; error: string | null }>({ open: false, account: null, error: null })
  const detailRequest = useRef<AbortController | null>(null)
  const mutationInFlight = useRef(false)
  useEffect(() => () => detailRequest.current?.abort(), [])
  function closeDetail() { detailRequest.current?.abort(); setDetail({ open: false, account: null, error: null }) }
  async function openDetail(account: AdminUserItem) {
    detailRequest.current?.abort()
    const controller = new AbortController(); detailRequest.current = controller
    setDetail({ open: true, account: null, error: null })
    try {
      const result = await getAdminUser(account.id, controller.signal)
      if (!controller.signal.aborted) setDetail({ open: true, account: result, error: null })
    } catch (error) {
      if (!controller.signal.aborted) setDetail({ open: true, account: null, error: error instanceof Error ? error.message : 'No se pudo consultar la cuenta.' })
    }
  }

  const requestIdRef = useRef(0)

  const loadUsers = useCallback(async (page: number, search: string) => {
    const requestId = ++requestIdRef.current

    try {
      setLoading(true)
      setErrorMessage(null)

      const result = await getAdminUsers({
        page,
        perPage: PER_PAGE,
        search,
      })

      if (requestId !== requestIdRef.current) return

      setUsers(result.users)
      setPagination({
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total,
        from: result.meta.from,
        to: result.meta.to,
      })

      if (result.meta.last_page > 0 && page > result.meta.last_page) {
        setCurrentPage(result.meta.last_page)
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return

      setUsers([])
      setPagination(null)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los usuarios.',
      )
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void loadUsers(currentPage, searchTerm)
    })
    return () => {
      cancelled = true
      requestIdRef.current += 1
    }
  }, [currentPage, searchTerm, loadUsers])

  const handleSearch = (query: string) => {
    setCurrentPage(1)
    if (query === searchTerm && currentPage === 1) {
      void loadUsers(1, query)
      return
    }
    setSearchTerm(query)
  }

  // Confirma el cambio global de cuenta y vuelve a consultar el listado.
  const handleConfirmToggle = async () => {
    if (!pendingToggle || mutationInFlight.current) return
    mutationInFlight.current = true

    const newStatus = pendingToggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

    try {
      setToggling(true)
      setErrorMessage(null)

      const updated = await updateAdminUserStatus(
        pendingToggle.id,
        newStatus,
      )

      setUsers((prev) =>
        prev.map((user) =>
          user.id === updated.id ? { ...user, ...updated } : user,
        ),
      )
      notify('success', `Cuenta ${newStatus === 'ACTIVE' ? 'activada' : 'desactivada'} correctamente.`)
      await loadUsers(currentPage, searchTerm)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el estado del usuario.',
      )
    } finally {
      setToggling(false)
      mutationInFlight.current = false
      setPendingToggle(null)
    }
  }

  const pendingWillDeactivate = pendingToggle?.status === 'ACTIVE'
  const pendingName = pendingToggle
    ? `${pendingToggle.first_names} ${pendingToggle.last_names}`
    : ''

  return (
    <div className={styles.pageContainer}>
      <nav aria-label="Breadcrumbs" className={styles.breadcrumbs}>
        <span className={styles.breadcrumbLink}>Inicio</span>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbLink}>Usuarios</span>
        <span className={styles.breadcrumbSeparatorActive}>/</span>
        <span className={styles.breadcrumbCurrent}>{rolesView ? 'Roles y permisos' : 'Gestionar usuarios'}</span>
      </nav>

      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <h1>{rolesView ? 'Roles y permisos' : 'Gestión de usuarios'}</h1>
          <p>
            Cuentas institucionales. El estado de cuenta es global y no modifica el estado particular de sus perfiles. Los roles se administran por separado en HU22.
          </p>
        </div>
      </header>

      <>
        <DataTable<AdminUserItem>
          columns={USER_COLUMNS}
          data={users}
          loading={loading}
          error={errorMessage}
          pagination={pagination}
          entityLabel="usuarios"
          searchPlaceholder="Buscar por nombre, apellido, correo o código institucional"
          onSearch={handleSearch}
          onPageChange={setCurrentPage}
          onRetry={() => void loadUsers(currentPage, searchTerm)}
          viewActionLabel={rolesView ? 'Gestionar roles' : 'Ver detalle'}
          getProfilePath={rolesView ? (account) => `/admin/users/${account.id}/roles` : undefined}
          onViewProfile={rolesView ? undefined : (account) => void openDetail(account)}
          onToggleStatus={rolesView ? undefined : (account) => {
            if (account.id === currentUser?.id) { notify('error', 'No puedes desactivar tu propia cuenta.'); return }
            setPendingToggle(account)
          }}
          emptyTitle="No se encontraron usuarios"
          emptyDescription={
            searchTerm
              ? 'Prueba con otro nombre, correo o código institucional.'
              : 'Todavía no existen usuarios registrados en el sistema.'
          }
        />
      </>
      {detail.open && <CollaborationModal title="Detalle de cuenta" onClose={closeDetail}>
        {detail.error ? <p role="alert">{detail.error}</p> : detail.account ? <>
          <dl><dt>Nombre</dt><dd>{detail.account.full_name}</dd><dt>Código institucional</dt><dd>{detail.account.institutional_code ?? 'No registrado'}</dd>
            <dt>CI</dt><dd>{detail.account.identity_number ?? 'No registrado'}</dd><dt>Correo</dt><dd>{detail.account.email}</dd>
            <dt>Estado global</dt><dd>{detail.account.status}</dd><dt>Roles permanentes</dt><dd>{detail.account.role_label}</dd>
            <dt>Perfil docente</dt><dd>{detail.account.teacher_status ?? 'Sin perfil'}</dd><dt>Perfil estudiantil</dt><dd>{detail.account.student_status ?? 'Sin perfil'}</dd></dl>
          <Link to={`/admin/users/${detail.account.id}/roles`} onClick={closeDetail}>Gestionar roles y permisos (HU22)</Link>
          {detail.account.teacher_id && <p><Link to={`/admin/teachers/${detail.account.teacher_id}`} onClick={closeDetail}>Ver perfil docente</Link></p>}
          {detail.account.student_id && <p><Link to={`/admin/students/${detail.account.student_id}`} onClick={closeDetail}>Ver perfil estudiantil</Link></p>}
        </> : <p role="status">Cargando cuenta…</p>}
      </CollaborationModal>}

      {/* Cuadro de diálogo de confirmación para Activar / Desactivar */}
      <ConfirmDialog
        isOpen={pendingToggle !== null}
        title={pendingWillDeactivate ? 'Desactivar cuenta' : 'Activar cuenta'}
        message={
          pendingWillDeactivate
            ? `¿Seguro que deseas desactivar la cuenta de ${pendingName}? El usuario no podrá acceder al sistema hasta que la actives nuevamente.`
            : `¿Seguro que deseas activar la cuenta de ${pendingName}? El usuario podrá volver a acceder al sistema.`
        }
        confirmLabel={pendingWillDeactivate ? 'Sí, desactivar' : 'Sí, activar'}
        variant={pendingWillDeactivate ? 'danger' : 'success'}
        loading={toggling}
        onConfirm={handleConfirmToggle}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  )
}
