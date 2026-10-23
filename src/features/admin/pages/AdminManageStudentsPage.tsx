import { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink } from 'react-router'

import { ConfirmDialog } from '@/features/admin/components/ConfirmDialog'
import { CreateStudentModal } from '@/features/admin/components/CreateStudentModal'
import {
  getAdminStudents,
  updateAdminStudentStatus,
} from '@/features/admin/api/adminStudentsApi'
import type { Student } from '@/features/admin/types/student.types'

import { DataTable } from '@/shared/components/DataTable/DataTable'
import type {
  TableColumnDef,
  TablePaginationMeta,
} from '@/shared/components/DataTable/dataTable.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'

import styles from './AdminManageStudentsPage.module.css'

const PER_PAGE = 10

/**
 * Extensión local de tipo en caso de que la interfaz base Student
 * no tenga tipado explícito para el carnet de identidad (CI).
 */
type StudentRowItem = Student & {
  identity_number?: string
}

/**
 * Contrato declarativo de columnas y anchos para la tabla de Estudiantes.
 * Definido fuera del componente para evitar recrear el arreglo en cada render.
 */
const STUDENT_COLUMNS: readonly TableColumnDef<StudentRowItem>[] = [
  {
    id: 'code',
    header: 'Código',
    width: '16%',
    accessorKey: 'institutional_code',
  },
  {
    id: 'student',
    header: 'Estudiante',
    width: '28%',
    cell: (student) => (
      <div>
        <span className={tableStyles.primaryText}>
          {student.last_names} {student.first_names}
        </span>
        {student.identity_number && (
          <span className={tableStyles.secondaryText}>
            CI: {student.identity_number}
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'email',
    header: 'Correo Institucional',
    width: '30%',
    accessorKey: 'email',
  },
  {
    id: 'status',
    header: 'Estado',
    width: '12%',
    accessorKey: 'status',
  },
]

export function AdminManageStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [students, setStudents] = useState<StudentRowItem[]>([])
  const [pagination, setPagination] = useState<TablePaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [pendingToggle, setPendingToggle] = useState<StudentRowItem | null>(null)
  const [toggling, setToggling] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createdNotice, setCreatedNotice] = useState<string | null>(null)

  const requestIdRef = useRef(0)

  const loadStudents = useCallback(async (page: number, search: string) => {
    const requestId = ++requestIdRef.current

    try {
      setLoading(true)
      setErrorMessage(null)

      const result = await getAdminStudents({
        page,
        perPage: PER_PAGE,
        search,
      })

      if (requestId !== requestIdRef.current) return

      setStudents(result.students)
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

      setStudents([])
      setPagination(null)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los estudiantes.',
      )
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => { if (!cancelled) void loadStudents(currentPage, searchTerm) })
    return () => { cancelled = true; requestIdRef.current += 1 }
  }, [currentPage, searchTerm, loadStudents])

  const handleSearch = (query: string) => {
    setCurrentPage(1)
    if (query === searchTerm && currentPage === 1) {
      void loadStudents(1, query)
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

      const updated = await updateAdminStudentStatus(
        pendingToggle.id,
        newStatus,
      )

      setStudents((prev) =>
        prev.map((student) =>
          student.id === updated.id ? { ...student, ...updated } : student,
        ),
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el estado del estudiante.',
      )
    } finally {
      setToggling(false)
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
        <span className={styles.breadcrumbLink}>Estudiantes</span>
        <span className={styles.breadcrumbSeparatorActive}>/</span>
        <span className={styles.breadcrumbCurrent}>Gestionar estudiantes</span>
      </nav>

      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <h1>Gestión de estudiantes</h1>
          <p>
            Consulta y administra los estudiantes registrados en el sistema EIDA.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => { setCreatedNotice(null); setCreating(true) }}>
            + Registrar estudiante
          </button>
          <NavLink
            to="/admin/students/import"
            className={styles.secondaryButton}
          >
            + Importar CSV
          </NavLink>
        </div>
      </header>

      {createdNotice && <p role="status">{createdNotice}</p>}
      {creating && <CreateStudentModal onClose={() => setCreating(false)} onCreated={() => {
        setCreating(false)
        setCreatedNotice('Estudiante registrado correctamente.')
        void loadStudents(currentPage, searchTerm)
      }} />}

      <DataTable<StudentRowItem>
        columns={STUDENT_COLUMNS}
        data={students}
        loading={loading}
        error={errorMessage}
        pagination={pagination}
        entityLabel="estudiantes"
        searchPlaceholder="Buscar por nombre, apellido, correo o código institucional"
        onSearch={handleSearch}
        onPageChange={setCurrentPage}
        onRetry={() => void loadStudents(currentPage, searchTerm)}
        getProfilePath={(student) => `/admin/students/${student.id}`}
        onToggleStatus={(student) => setPendingToggle(student)}
        emptyTitle="No se encontraron estudiantes"
        emptyDescription={
          searchTerm
            ? 'Prueba con otro nombre, correo o código institucional.'
            : 'Todavía no existen estudiantes registrados en el sistema.'
        }
      />

      <ConfirmDialog
        isOpen={pendingToggle !== null}
        title={pendingWillDeactivate ? 'Desactivar cuenta' : 'Activar cuenta'}
        message={
          pendingWillDeactivate
            ? `¿Seguro que deseas desactivar la cuenta de ${pendingName}? El estudiante no podrá acceder al sistema hasta que la actives nuevamente.`
            : `¿Seguro que deseas activar la cuenta de ${pendingName}? El estudiante podrá volver a acceder al sistema.`
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
