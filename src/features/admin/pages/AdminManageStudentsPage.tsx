import { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink } from 'react-router'
import styles from './AdminManageStudentsPage.module.css'
import { SearchIcon } from '@/assets/icons/SearchIcon'
import { StudentDetailModal } from '@/features/admin/components/StudentDetailModal'
import { ConfirmDialog } from '@/features/admin/components/ConfirmDialog'
import { getAdminStudents, updateAdminStudentStatus } from '@/features/admin/api/adminStudentsApi'
import type { Student, StudentDetail } from '@/features/admin/types/student.types'

const PER_PAGE = 10

export function AdminManageStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [openInEditMode, setOpenInEditMode] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<Student | null>(null)
  const [toggling, setToggling] = useState(false)

  const requestIdRef = useRef(0)

  const loadStudents = useCallback(async (page: number, search: string) => {
    const requestId = ++requestIdRef.current
    try {
      setLoading(true)
      setErrorMessage(null)
      const result = await getAdminStudents({ page, perPage: PER_PAGE, search })
      if (requestId !== requestIdRef.current) return

      setStudents(result.students)
      setTotalPages(result.meta.last_page)
      setTotalRecords(result.meta.total)

      if (result.meta.last_page > 0 && page > result.meta.last_page) {
        setCurrentPage(result.meta.last_page)
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      setStudents([])
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar los estudiantes.',
      )
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStudents(currentPage, searchTerm)
  }, [currentPage, searchTerm, loadStudents])

  const handleSearch = () => {
    setCurrentPage(1)
    setSearchTerm(searchInput)
  }

  const openModal = (studentId: string, editMode: boolean) => {
    setOpenInEditMode(editMode)
    setSelectedStudentId(studentId)
  }

  const closeModal = () => setSelectedStudentId(null)
  const handleStudentUpdated = (updated: StudentDetail) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === updated.id
          ? {
              ...s,
              institutional_code: updated.institutional_code,
              first_names: updated.first_names,
              last_names: updated.last_names,
              email: updated.email,
              career: updated.career,
              status: updated.status,
            }
          : s,
      ),
    )
  }

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return
    const newStatus = pendingToggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      setToggling(true)
      setErrorMessage(null)
      const updated = await updateAdminStudentStatus(pendingToggle.id, newStatus)
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo cambiar el estado del estudiante.',
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
        <NavLink to="/admin" className={styles.breadcrumbLink}>Inicio</NavLink>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbLink}>Estudiantes</span>
        <span className={styles.breadcrumbSeparatorActive}>/</span>
        <span className={styles.breadcrumbCurrent}>Gestionar estudiantes</span>
      </nav>

      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <h1>Gestión de estudiantes</h1>
          <p>Consulta y administra los estudiantes registrados en el sistema EIDA.</p>
        </div>
        <div className={styles.headerActions}>
          <NavLink to="/admin/students/import" className={styles.secondaryButton}>
            + Importar CSV
          </NavLink>
          {/*<button className={styles.primaryButton} onClick={() => navigate('/admin/students/new')}>
            + Registrar estudiantes
          </button>*/}
        </div>
      </header>

      <main className={styles.tableContainer}>
        <div className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <SearchIcon className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, correo o código institucional"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={styles.searchInput}
            />
          </div>
          <button className={styles.searchButton} onClick={handleSearch}>Buscar</button>
        </div>

        {errorMessage && (
          <p role="alert" className={styles.emptyState}>{errorMessage}</p>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.studentsTable}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Estudiante</th>
                <th>Correo Institucional</th>
                <th>Estado</th>
                <th className={styles.textRight}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>Cargando estudiantes...</td>
                </tr>
              ) : students.length > 0 ? (
                students.map((student) => {
                  const isActive = student.status === 'ACTIVE'
                  return (
                    <tr key={student.id}>
                      <td className={styles.cellCode}>{student.institutional_code}</td>
                      <td>
                        <div className={styles.studentInfo}>
                          <span className={styles.studentName}>
                            {student.last_names} {student.first_names}
                          </span>
                        </div>
                      </td>
                      <td className={styles.cellEmail}>{student.email}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                          <span className={styles.statusDot}></span>
                          {isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            className={styles.actionBtnText}
                            onClick={() => openModal(student.id, false)}
                          >
                            Ver detalle
                          </button>
                          <button
                            className={styles.actionBtnText}
                            onClick={() => openModal(student.id, true)}
                          >
                            Editar
                          </button>
                          <button
                            className={isActive ? styles.actionBtnDanger : styles.actionBtnSuccess}
                            onClick={() => setPendingToggle(student)}
                          >
                            {isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                !errorMessage && (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      No se encontraron estudiantes registrados.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span className={styles.paginationSummary}>
            {totalRecords > 0
              ? `Mostrando página ${currentPage} de ${totalPages} (${totalRecords} en total)`
              : 'Mostrando 0 estudiantes'}
          </span>
          <div className={styles.paginationControls}>
            <button
              className={currentPage > 1 ? styles.pageBtn : styles.pageBtnDisabled}
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Anterior
            </button>
            <span className={styles.pageCurrent}>
              Página {currentPage} de {totalPages || 1}
            </span>
            <button
              className={currentPage < totalPages ? styles.pageBtn : styles.pageBtnDisabled}
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </main>

      <StudentDetailModal
        isOpen={selectedStudentId !== null}
        onClose={closeModal}
        studentId={selectedStudentId}
        startInEditMode={openInEditMode}
        onUpdated={handleStudentUpdated}
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
