import { useEffect, useState } from 'react'
import styles from './StudentDetailModal.module.css'
import {
  StudentApiError,
  getAdminStudent,
  updateAdminStudent,
} from '@/features/admin/api/adminStudentsApi'
import { ConfirmDialog } from '@/features/admin/components/ConfirmDialog'
import type {
  StudentCareer,
  StudentDetail,
  StudentField,
  StudentFieldErrors,
  UpdateStudentPayload,
} from '@/features/admin/types/student.types'

type EditableField = 'first_names' | 'last_names' | 'identity_number' | 'email'

type EditForm = Record<EditableField, string>

const EMPTY_FORM: EditForm = {
  first_names: '',
  last_names: '',
  identity_number: '',
  email: '',
}

const FIELD_LABELS: Record<EditableField, string> = {
  first_names: 'Nombres',
  last_names: 'Apellidos',
  identity_number: 'Carnet de identidad',
  email: 'Correo institucional',
}

const EDITABLE_FIELDS: EditableField[] = ['first_names', 'last_names', 'identity_number', 'email']

interface StudentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  /** ID del estudiante: el detalle (con CI) se consulta a GET /admin/students/{id}. */
  studentId: string | null
  /** Abre el modal directamente en modo edición (botón "Editar" de la tabla). */
  startInEditMode?: boolean
  /** Se llama con el detalle actualizado tras guardar, para refrescar la tabla. */
  onUpdated?: (student: StudentDetail) => void
}

function formatCareer(career: StudentCareer | undefined): string {
  if (!career) return '—'
  return typeof career === 'string' ? career : career.name
}

function toForm(student: StudentDetail): EditForm {
  return {
    first_names: student.first_names ?? '',
    last_names: student.last_names ?? '',
    identity_number: student.identity_number ?? '',
    email: student.email ?? '',
  }
}

export function StudentDetailModal({
  isOpen,
  onClose,
  studentId,
  startInEditMode = false,
  onUpdated,
}: StudentDetailModalProps) {
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<StudentFieldErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Cargar el detalle desde GET /admin/students/{id}
  useEffect(() => {
    if (!isOpen || !studentId) return

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setStudent(null)
    setEditing(false)
    setFieldErrors({})
    setSaveError(null)
    setConfirmOpen(false)

    getAdminStudent(studentId)
      .then((detail) => {
        if (cancelled) return
        setStudent(detail)
        setForm(toForm(detail))
        setEditing(startInEditMode)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el estudiante.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, studentId, startInEditMode])

  // Cerrar con Escape (el ConfirmDialog intercepta Escape cuando está abierto)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, saving])

  if (!isOpen || !studentId) return null

  const isActive = student?.status === 'ACTIVE'

  const getInitials = () => {
    if (!student) return ''
    const first = student.first_names?.charAt(0) ?? ''
    const last = student.last_names?.charAt(0) ?? ''
    return `${first}${last}`.toUpperCase()
  }

  /** Campos modificados respecto al original (PATCH parcial). */
  const getChanges = (): UpdateStudentPayload => {
    if (!student) return {}
    const changes: UpdateStudentPayload = {}
    for (const field of EDITABLE_FIELDS) {
      const value = form[field].trim()
      if (value !== (student[field] ?? '')) changes[field] = value
    }
    return changes
  }

  const changes = getChanges()
  const changedFields = Object.keys(changes) as EditableField[]
  const hasChanges = changedFields.length > 0

  const validate = (): StudentFieldErrors => {
    const errors: StudentFieldErrors = {}
    for (const field of EDITABLE_FIELDS) {
      if (!form[field].trim()) errors[field] = ['Este campo es obligatorio.']
    }
    if (!errors.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      errors.email = ['Ingresa un correo válido.']
    }
    return errors
  }

  const handleChange = (field: EditableField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleStartEdit = () => {
    if (!student) return
    setForm(toForm(student))
    setFieldErrors({})
    setSaveError(null)
    setEditing(true)
  }

  const handleCancelEdit = () => {
    if (student) setForm(toForm(student))
    setFieldErrors({})
    setSaveError(null)
    setEditing(false)
  }

  // Paso 1: validar y abrir el diálogo de confirmación
  const handleRequestSave = () => {
    const errors = validate()
    setFieldErrors(errors)
    setSaveError(null)
    if (Object.keys(errors).length > 0 || !hasChanges) return
    setConfirmOpen(true)
  }

  // Paso 2: confirmado → PATCH /admin/students/{id}
  const handleConfirmSave = async () => {
    if (!student) return
    try {
      setSaving(true)
      const updated = await updateAdminStudent(student.id, changes)
      const merged = { ...student, ...updated }
      setStudent(merged)
      setForm(toForm(merged))
      setEditing(false)
      setConfirmOpen(false)
      onUpdated?.(merged)
    } catch (err) {
      setConfirmOpen(false)
      if (err instanceof StudentApiError) {
        setFieldErrors(err.fieldErrors)
        setSaveError(err.message)
      } else {
        setSaveError('No se pudo actualizar el estudiante.')
      }
    } finally {
      setSaving(false)
    }
  }

  const renderEditable = (field: EditableField, type: 'text' | 'email' = 'text') => {
    const errorMessage = fieldErrors[field as StudentField]?.[0]
    const inputId = `student-edit-${field}`

    return (
      <div className={styles.infoItem}>
        <label htmlFor={inputId} className={styles.infoLabel}>{FIELD_LABELS[field]}</label>
        {editing ? (
          <>
            <input
              id={inputId}
              type={type}
              className={`${styles.input} ${errorMessage ? styles.inputError : ''}`}
              value={form[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              disabled={saving}
              aria-invalid={errorMessage ? true : undefined}
            />
            {errorMessage && <span className={styles.fieldError}>{errorMessage}</span>}
          </>
        ) : (
          <span className={styles.infoValue}>{student?.[field]}</span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className={styles.modalOverlay} onClick={() => !saving && onClose()} role="dialog" aria-modal="true">
        <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
          {/* Cabecera */}
          <div className={styles.modalHeader}>
            <div className={styles.headerTitles}>
              <span className={styles.contextText}>
                {editing ? 'EDITANDO INFORMACIÓN' : 'INFORMACIÓN REGISTRADA'}
              </span>
              <h2 className={styles.titleText}>
                {editing ? 'Editar estudiante' : 'Detalle del estudiante'}
              </h2>
            </div>
            <button className={styles.closeButton} onClick={onClose} disabled={saving} aria-label="Cerrar modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Contenido */}
          <div className={styles.modalContent}>
            {loading && <p className={styles.stateText}>Cargando información del estudiante...</p>}
            {loadError && <p role="alert" className={styles.formError}>{loadError}</p>}

            {student && (
              <>
                <div className={styles.profileSection}>
                  <div className={styles.avatar}>{getInitials()}</div>
                  <div className={styles.identity}>
                    <h3 className={styles.fullName}>
                      {student.first_names} {student.last_names}
                    </h3>
                    <div className={styles.statusRow}>
                      <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                        <span className={styles.statusDot}></span>
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.divider}></div>

                {saveError && <p role="alert" className={styles.formError}>{saveError}</p>}

                <div className={styles.infoGrid}>
                  {/* Solo lectura: el backend/identidad institucional no se modifica desde aquí */}
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>CÓDIGO INSTITUCIONAL</span>
                    <span className={styles.infoValue}>{student.institutional_code}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>CARRERA</span>
                    <span className={styles.infoValue}>{formatCareer(student.career)}</span>
                  </div>

                  {renderEditable('first_names')}
                  {renderEditable('last_names')}
                  {renderEditable('identity_number')}
                  {renderEditable('email', 'email')}
                </div>
              </>
            )}
          </div>

          {/* Acciones */}
          <div className={styles.modalFooter}>
            {editing ? (
              <>
                <button
                  className={styles.primaryButton}
                  onClick={handleRequestSave}
                  disabled={saving || !hasChanges}
                >
                  Guardar cambios
                </button>
                <button className={styles.secondaryButton} onClick={handleCancelEdit} disabled={saving}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button className={styles.primaryButton} onClick={handleStartEdit} disabled={!student}>
                  Editar estudiante
                </button>
                <button className={styles.secondaryButton} onClick={onClose}>
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Confirmar cambios"
        message={`Se actualizarán los siguientes datos del estudiante: ${changedFields
          .map((f) => FIELD_LABELS[f].toLowerCase())
          .join(', ')}. ¿Deseas guardar los cambios?`}
        confirmLabel="Sí, guardar"
        loading={saving}
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
