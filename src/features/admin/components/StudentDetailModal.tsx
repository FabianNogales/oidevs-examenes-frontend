import { useEffect } from 'react'
import styles from './StudentDetailModal.module.css'

// Estructura de datos que recibirá desde tu página principal o API
export interface StudentDetail {
  id: string
  codigo: string
  ci: string
  nombres: string
  apellidos: string
  correo: string
  carrera: string
  estado: 'Activo' | 'Inactivo'
  rolActual: string
}

interface StudentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (studentId: string) => void
  student: StudentDetail | null
}

export function StudentDetailModal({
  isOpen,
  onClose,
  onEdit,
  student,
}: StudentDetailModalProps) {
  // Cerrar el modal con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !student) return null

  // Extraer iniciales para el avatar (Ej: Rodrigo Zarate -> RZ)
  const getInitials = () => {
    const first = student.nombres ? student.nombres.charAt(0) : ''
    const last = student.apellidos ? student.apellidos.charAt(0) : ''
    return `${first}${last}`.toUpperCase()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      {/* Contenedor del Modal (e.stopPropagation evita que el click dentro cierre el modal) */}
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        
        {/* Cabecera */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitles}>
            <span className={styles.contextText}>INFORMACIÓN REGISTRADA</span>
            <h2 className={styles.titleText}>Detalle del estudiante</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar modal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Contenido Principal */}
        <div className={styles.modalContent}>
          {/* Sección de Perfil */}
          <div className={styles.profileSection}>
            <div className={styles.avatar}>
              {getInitials()}
            </div>
            <div className={styles.identity}>
              <h3 className={styles.fullName}>
                {student.nombres} {student.apellidos}
              </h3>
              <div className={styles.statusRow}>
                <span className={`${styles.statusBadge} ${student.estado === 'Activo' ? styles.statusActive : styles.statusInactive}`}>
                  <span className={styles.statusDot}></span>
                  {student.estado}
                </span>
                <span className={styles.roleLabel}>
                  ROL ACTUAL: <strong className={styles.roleValue}>{student.rolActual}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* Cuadrícula de Información */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>CÓDIGO INSTITUCIONAL</span>
              <span className={styles.infoValue}>{student.codigo}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>CARNET DE IDENTIDAD</span>
              <span className={styles.infoValue}>{student.ci}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>NOMBRES</span>
              <span className={styles.infoValue}>{student.nombres}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>APELLIDOS</span>
              <span className={styles.infoValue}>{student.apellidos}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>CORREO INSTITUCIONAL</span>
              <span className={styles.infoValue}>{student.correo}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>CARRERA</span>
              <span className={styles.infoValue}>{student.carrera}</span>
            </div>
          </div>
        </div>

        {/* Pie de Acciones */}
        <div className={styles.modalFooter}>
          <button 
            className={styles.primaryButton}
            onClick={() => onEdit(student.id)}
          >
            Editar estudiante
          </button>
          <button className={styles.secondaryButton} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}