import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import {
  EntityProfileLayout,
  EntityInfoGrid,
  type EntitySidebarOption,
  type EntityInfoCard,
} from '@/features/admin/components/EntityProfileLayout'
import layoutStyles from '@/features/admin/components/EntityProfileLayout.module.css'
import {
  getAdminStudent,
  updateAdminStudent,
} from '@/features/admin/api/adminStudentsApi'
import type { StudentDetail } from '@/features/admin/types/student.types'

type StudentTabId = 'perfil' | 'editar' | 'materias-actuales' | 'historial-materias'

const STUDENT_OPTIONS: readonly EntitySidebarOption[] = [
  { id: 'perfil', label: 'Perfil', icon: 'user' },
  { id: 'editar', label: 'Editar datos', icon: 'edit' },
  { id: 'materias-actuales', label: 'Materias actuales', icon: 'book' },
  { id: 'historial-materias', label: 'Historial de materias', icon: 'history' },
]

function getInitials(firstNames?: string, lastNames?: string): string {
  const first = firstNames?.trim().charAt(0) ?? ''
  const last = lastNames?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'ES'
}

export function AdminStudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = (searchParams.get('tab') as StudentTabId) || 'perfil'
  const [activeTab, setActiveTab] = useState<StudentTabId>(
    STUDENT_OPTIONS.some((o) => o.id === initialTab) ? initialTab : 'perfil',
  )

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados del formulario "Editar datos"
  const [firstNames, setFirstNames] = useState('')
  const [lastNames, setLastNames] = useState('')
  const [email, setEmail] = useState('')
  const [career, setCareer] = useState('') 
  const [saving, setSaving] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const syncFormWithStudent = useCallback((data: StudentDetail) => {
    setFirstNames(data.first_names ?? '')
    setLastNames(data.last_names ?? '')
    setEmail(data.email ?? '')
    
    const careerName = typeof data.career === 'object' && data.career !== null 
      ? (data.career as { name: string }).name 
      : (data.career as unknown as string)

    setCareer(careerName ?? '')
  }, [])

  useEffect(() => {
    if (!studentId) return
    let active = true

    async function fetchDetail() {
      try {
        setLoading(true)
        setError(null)
        // <-- CORRECCIÓN: Llamamos a getAdminStudent
        const data = await getAdminStudent(studentId!)
        if (!active) return
        setStudent(data)
        syncFormWithStudent(data)
      } catch (err) {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la información del estudiante.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchDetail()
    return () => {
      active = false
    }
  }, [studentId, syncFormWithStudent])

  const handleOptionChange = (optionId: string) => {
    const nextTab = optionId as StudentTabId
    setActiveTab(nextTab)
    setSaveFeedback(null)
    setSearchParams(nextTab === 'perfil' ? {} : { tab: nextTab }, { replace: true })
  }

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!student || saving) return

    const trimmedFirst = firstNames.trim()
    const trimmedLast = lastNames.trim()

    if (!trimmedFirst || !trimmedLast) {
      setSaveFeedback({
        type: 'error',
        text: 'Los nombres y apellidos son obligatorios y no pueden quedar vacíos.',
      })
      return
    }

    try {
      setSaving(true)
      setSaveFeedback(null)
      
      const updated = await updateAdminStudent(student.id, {
        first_names: trimmedFirst,
        last_names: trimmedLast,
        email: email.trim(),
      })
      
      setStudent(updated)
      syncFormWithStudent(updated)
      setSaveFeedback({
        type: 'success',
        text: 'Datos del estudiante actualizados correctamente.',
      })
    } catch (err) {
      setSaveFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'No se pudieron guardar los cambios.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={layoutStyles.mainArea}>
        <div className={layoutStyles.sectionCard}>Cargando perfil del estudiante...</div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className={layoutStyles.mainArea}>
        <div className={layoutStyles.sectionCard} role="alert">
          <h2>Error al cargar estudiante</h2>
          <p>{error ?? 'No se encontró el registro solicitado.'}</p>
          <button
            type="button"
            className={layoutStyles.cancelBtn}
            onClick={() => navigate('/admin/students/manage')}
          >
            Regresar a gestión de estudiantes
          </button>
        </div>
      </div>
    )
  }

  const isActive = student.status === 'ACTIVE'
  const fullName = `${student.first_names} ${student.last_names}`.trim()
  const initials = getInitials(student.first_names, student.last_names)

  const displayCareer = typeof student.career === 'object' && student.career !== null 
    ? (student.career as { name: string }).name 
    : (student.career as unknown as string);

  const profileCards: EntityInfoCard[] = [
    {
      id: 'first_names',
      label: 'Nombre',
      value: student.first_names,
      icon: 'user',
    },
    {
      id: 'sis',
      label: 'Código institucional (SIS)',
      value: student.institutional_code,
      icon: 'institution',
    },
    {
      id: 'last_names',
      label: 'Apellidos',
      value: student.last_names,
      icon: 'user',
    },
    {
      id: 'career',
      label: 'Carrera',
      value: displayCareer || 'No registrada',
      icon: 'career',
    },
    {
      id: 'email',
      label: 'Correo electrónico',
      value: student.email,
      icon: 'mail',
    },
    {
      id: 'status',
      label: 'Estado de la cuenta',
      value: (
        <span
          className={`${layoutStyles.accountStatusPill} ${
            isActive
              ? layoutStyles.accountStatusActive
              : layoutStyles.accountStatusInactive
          }`}
        >
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
      icon: 'info',
    },
    {
      id: 'ci',
      label: 'Carnet de Identidad (CI)',
      value: (student as { identity_number?: string }).identity_number || 'No registrado',
      icon: 'id-card',
    },
    {
      id: 'role',
      label: 'Rol actual',
      value: 'Estudiante',
      icon: 'user',
    },
  ]

  return (
    <EntityProfileLayout
      initials={initials}
      fullName={fullName}
      roleLabel="Estudiante"
      isActive={isActive}
      options={STUDENT_OPTIONS}
      activeOptionId={activeTab}
      onOptionChange={handleOptionChange}
      onBack={() => navigate('/admin/students/manage')}
    >
      {/* OPCIÓN 1: PERFIL */}
      {activeTab === 'perfil' && <EntityInfoGrid cards={profileCards} />}

      {/* OPCIÓN 2: EDITAR DATOS */}
      {activeTab === 'editar' && (
        <section className={layoutStyles.sectionCard}>
          <h2>Editar datos del estudiante</h2>
          <p>Modifica los nombres y los campos habilitados para administración.</p>

          <form className={layoutStyles.editForm} onSubmit={handleSaveEdit}>
            {saveFeedback && (
              <p
                role="alert"
                className={`${layoutStyles.feedbackMsg} ${
                  saveFeedback.type === 'success'
                    ? layoutStyles.feedbackSuccess
                    : layoutStyles.feedbackError
                }`}
              >
                {saveFeedback.text}
              </p>
            )}

            <div className={layoutStyles.formGroup}>
              <label htmlFor="edit-first-names">Nombre(s)</label>
              <input
                id="edit-first-names"
                type="text"
                className={layoutStyles.formInput}
                value={firstNames}
                onChange={(e) => setFirstNames(e.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div className={layoutStyles.formGroup}>
              <label htmlFor="edit-last-names">Apellidos</label>
              <input
                id="edit-last-names"
                type="text"
                className={layoutStyles.formInput}
                value={lastNames}
                onChange={(e) => setLastNames(e.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div className={layoutStyles.formGroup}>
              <label htmlFor="edit-email">Correo electrónico</label>
              <input
                id="edit-email"
                type="email"
                className={layoutStyles.formInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div className={layoutStyles.formGroup}>
              <label htmlFor="edit-career">Carrera</label>
              <input
                id="edit-career"
                type="text"
                className={layoutStyles.formInput}
                value={career}
                disabled 
              />
            </div>

            <div className={layoutStyles.formGroup}>
              <label htmlFor="edit-sis">Código institucional (SIS)</label>
              <input
                id="edit-sis"
                type="text"
                className={layoutStyles.formInput}
                value={student.institutional_code}
                disabled
              />
            </div>

            <div className={layoutStyles.formActions}>
              <button
                type="button"
                className={layoutStyles.cancelBtn}
                onClick={() => {
                  syncFormWithStudent(student)
                  handleOptionChange('perfil')
                }}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={layoutStyles.saveBtn}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* OPCIÓN 3: MATERIAS ACTUALES */}
      {activeTab === 'materias-actuales' && (
        <section className={layoutStyles.sectionCard}>
          <h2>Materias actuales</h2>
          <p>Listado de materias en las que el estudiante se encuentra inscrito en la gestión actual.</p>
        </section>
      )}

      {/* OPCIÓN 4: HISTORIAL DE MATERIAS */}
      {activeTab === 'historial-materias' && (
        <section className={layoutStyles.sectionCard}>
          <h2>Historial de materias</h2>
          <p>Registro histórico de materias cursadas y evaluaciones previas del estudiante.</p>
        </section>
      )}
    </EntityProfileLayout>
  )
}