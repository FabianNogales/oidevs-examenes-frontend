import { useState, useEffect, useCallback, useRef } from 'react'

import { ConfirmDialog } from '@/features/admin/components/ConfirmDialog'
import {
  getAdminUsersMock,
  updateAdminUserStatusMock,
  type AdminUserItem,
} from '@/features/admin/api/adminUsersMock'

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
          {user.last_names} {user.first_names}
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
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [pagination, setPagination] = useState<TablePaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [pendingToggle, setPendingToggle] = useState<AdminUserItem | null>(null)
  const [toggling, setToggling] = useState(false)

  const requestIdRef = useRef(0)

  const loadUsers = useCallback(async (page: number, search: string) => {
    const requestId = ++requestIdRef.current

    try {
      setLoading(true)
      setErrorMessage(null)

      const result = await getAdminUsersMock({
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
    void loadUsers(currentPage, searchTerm)
  }, [currentPage, searchTerm, loadUsers])

  const handleSearch = (query: string) => {
    setCurrentPage(1)
    if (query === searchTerm && currentPage === 1) {
      void loadUsers(1, query)
      return
    }
    setSearchTerm(query)
  }

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return

    const newStatus = pendingToggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

    try {
      setToggling(true)
      setErrorMessage(null)

      const updated = await updateAdminUserStatusMock(
        pendingToggle.id,
        newStatus,
      )

      setUsers((prev) =>
        prev.map((user) =>
          user.id === updated.id ? { ...user, ...updated } : user,
        ),
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el estado del usuario.',
      )
    } finally {
      setToggling(false)
      setPendingToggle(null)
    }
  }

  /**
   * Resuelve la ruta de "Ver perfil" según el rol del usuario
   * reutilizando las vistas de detalle existentes en el módulo Admin.
   */
  const resolveProfilePath = (user: AdminUserItem): string => {
    const targetId = user.entity_id ?? user.id
    if (user.role === 'TEACHER') {
      return `/admin/teachers/${targetId}`
    }
    if (user.role === 'STUDENT' || user.role === 'COLLABORATOR') {
      return `/admin/students/${targetId}`
    }
    return `/admin/users/${user.id}`
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
        <span className={styles.breadcrumbCurrent}>Gestionar usuarios</span>
      </nav>

      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <h1>Gestión de usuarios</h1>
          <p>
            Consulta y administra los usuarios y roles registrados en el sistema EIDA.
          </p>
        </div>
      </header>

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
        getProfilePath={resolveProfilePath}
        onToggleStatus={(user) => setPendingToggle(user)}
        emptyTitle="No se encontraron usuarios"
        emptyDescription={
          searchTerm
            ? 'Prueba con otro nombre, correo o código institucional.'
            : 'Todavía no existen usuarios registrados en el sistema.'
        }
      />

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