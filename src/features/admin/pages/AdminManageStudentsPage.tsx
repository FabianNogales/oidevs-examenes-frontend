import { useState } from 'react'
import { NavLink } from 'react-router'
import styles from './AdminManageStudentsPage.module.css'
import { SearchIcon } from '@/assets/icons/SearchIcon'
import { StudentDetailModal, type StudentDetail } from '@/features/admin/components/StudentDetailModal'

// ==========================================
// MOCK DATA (Para borrar luego)
// ==========================================
type StudentStatus = 'Activo' | 'Inactivo'

interface MockStudent {
  id: string
  codigo: string
  nombres: string
  apellidos: string
  ci: string
  correo: string
  estado: StudentStatus
}

// Datos Mock con IDs únicos para evitar advertencias de React
const MOCK_STUDENTS: MockStudent[] = [
  { id: '1', codigo: '548458465', nombres: 'Fabian Marcel', apellidos: 'Nogales Goitia', ci: '78919818', correo: 'nogaisfabianmarcel@umss.edu.bo', estado: 'Activo' },
  { id: '2', codigo: '202300949', nombres: 'Rodrigo', apellidos: 'Chalco Soliz', ci: '89828382382', correo: 'chalcosolizrodrigo@umss.edu.bo', estado: 'Activo' },
  { id: '3', codigo: '202300661', nombres: 'Erick Eduardo', apellidos: 'Arnez Torrico', ci: '8829988', correo: 'arneztorricoeduardo@umss.edu.bo', estado: 'Activo' },
  { id: '4', codigo: '213456879', nombres: 'Oliver Saul', apellidos: 'Garcia Guzman', ci: '12345678', correo: 'garciaoliversaul@umss.edu.bo', estado: 'Activo' },
  { id: '5', codigo: '202300660', nombres: 'Jose Daniel', apellidos: 'Condarco Flores', ci: '8829983', correo: '8829983@umss.edu.bo', estado: 'Inactivo' },
  { id: '6', codigo: '332423424', nombres: 'Hector Gabriel', apellidos: 'Gonzales Castro', ci: '88483873', correo: 'hgg@umss.edu.bo', estado: 'Activo' },
  { id: '7', codigo: '213456879', nombres: 'Oliver Saul', apellidos: 'Garcia Guzman', ci: '12345678', correo: 'garciaoliversaul@umss.edu.bo', estado: 'Activo' },
  { id: '8', codigo: '202300660', nombres: 'Jose Daniel', apellidos: 'Condarco Flores', ci: '8829983', correo: '8829983@umss.edu.bo', estado: 'Inactivo' },
  { id: '9', codigo: '332423424', nombres: 'Hector Gabriel', apellidos: 'Gonzales Castro', ci: '88483873', correo: 'hgg@umss.edu.bo', estado: 'Activo' },
  { id: '10', codigo: '213456879', nombres: 'Oliver Saul', apellidos: 'Garcia Guzman', ci: '12345678', correo: 'garciaoliversaul@umss.edu.bo', estado: 'Activo' },
  { id: '11', codigo: '202300660', nombres: 'Jose Daniel', apellidos: 'Condarco Flores', ci: '8829983', correo: '8829983@umss.edu.bo', estado: 'Inactivo' },
  { id: '12', codigo: '332423424', nombres: 'Hector Gabriel', apellidos: 'Gonzales Castro', ci: '88483873', correo: 'hgg@umss.edu.bo', estado: 'Activo' },
]

export function AdminManageStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null)

  // Función para preparar los datos y abrir el modal
  const handleViewDetail = (student: MockStudent) => {
    setSelectedStudent({
      id: student.id,
      codigo: student.codigo,
      ci: student.ci,
      nombres: student.nombres,
      apellidos: student.apellidos,
      correo: student.correo,
      carrera: 'Ingeniería de Sistemas', // Este dato vendrá de la BD después
      estado: student.estado,
      rolActual: 'Estudiante',
    })
    setIsDetailModalOpen(true)
  }

  // Simulación de búsqueda simple
  const filteredStudents = MOCK_STUDENTS.filter(
    (student) =>
      student.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.codigo.includes(searchTerm)
  )

  // LIMITADOR PARA LA VISTA ACTUAL (Máximo 10 estudiantes)
  const displayedStudents = filteredStudents.slice(0, 10)
  const totalFiltered = filteredStudents.length
  const currentCount = displayedStudents.length

  return (
    <div className={styles.pageContainer}>
      
      {/* 1. RUTA DE NAVEGACIÓN (Breadcrumbs) */}
      <nav aria-label="Breadcrumbs" className={styles.breadcrumbs}>
        <NavLink to="/admin" className={styles.breadcrumbLink}>
          Inicio
        </NavLink>
        <span className={styles.breadcrumbSeparator}>/</span>
        <NavLink to="/admin/students" className={styles.breadcrumbLink}>
          Estudiantes
        </NavLink>
        <span className={styles.breadcrumbSeparatorActive}>/</span>
        <span className={styles.breadcrumbCurrent}>Gestionar estudiantes</span>
      </nav>

      {/* 2. ENCABEZADO Y BOTONES DE ACCIÓN */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <h1>Gestión de estudiantes</h1>
          <p>Consulta y administra los estudiantes registrados en el sistema EIDA.</p>
        </div>
        <div className={styles.headerActions}>
          <NavLink to="/admin/students/import" className={styles.secondaryButton}>
            + Importar CSV
          </NavLink>
          <button className={styles.primaryButton}>
            + Registrar estudiantes
          </button>
        </div>
      </header>

      {/* 3. CONTENEDOR PRINCIPAL (Tabla y Búsqueda) */}
      <main className={styles.tableContainer}>
        
        {/* Barra de búsqueda */}
        <div className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <SearchIcon className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, correo o código institucional"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <button className={styles.searchButton}>Buscar</button>
        </div>

        {/* Tabla de Estudiantes */}
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
              {displayedStudents.length > 0 ? (
                displayedStudents.map((student) => (
                  <tr key={student.id}>
                    <td className={styles.cellCode}>{student.codigo}</td>
                    <td>
                      <div className={styles.studentInfo}>
                        <span className={styles.studentName}>
                          {student.apellidos} {student.nombres}
                        </span>
                        <span className={styles.studentCi}>
                          CI: {student.ci}
                        </span>
                      </div>
                    </td>
                    <td className={styles.cellEmail}>{student.correo}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          student.estado === 'Activo'
                            ? styles.statusActive
                            : styles.statusInactive
                        }`}
                      >
                        <span className={styles.statusDot}></span>
                        {student.estado}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button 
                          className={styles.actionBtnText} 
                          onClick={() => handleViewDetail(student)}
                        >
                          Ver detalle
                        </button>
                        <button className={styles.actionBtnText}>Editar</button>
                        {student.estado === 'Activo' ? (
                          <button className={styles.actionBtnDanger}>
                            Desactivar
                          </button>
                        ) : (
                          <button className={styles.actionBtnSuccess}>
                            Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    No se encontraron estudiantes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PAGINACIÓN */}
        <div className={styles.pagination}>
          <span className={styles.paginationSummary}>
            {totalFiltered > 0
              ? `Mostrando 1 a ${currentCount} de ${totalFiltered} estudiantes`
              : 'Mostrando 0 estudiantes'}
          </span>
          <div className={styles.paginationControls}>
            <button className={styles.pageBtnDisabled} disabled>
              Anterior
            </button>
            <span className={styles.pageCurrent}>
              Página 1 de {Math.ceil(totalFiltered / 10) || 1}
            </span>
            <button 
              className={totalFiltered > 10 ? styles.pageBtn : styles.pageBtnDisabled} 
              disabled={totalFiltered <= 10}
            >
              Siguiente
            </button>
          </div>
        </div>
      </main>

      {/* MODAL DE DETALLE */}
      <StudentDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={(id) => {
          console.log('Activar modo edición para el estudiante con ID:', id)
          setIsDetailModalOpen(false) // Cierra el detalle
          // openEditModal(id) // Lógica futura para abrir el modal de edición
        }}
        student={selectedStudent}
      />

    </div>
  )
}