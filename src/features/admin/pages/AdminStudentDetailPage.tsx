import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router'

import { EntityProfileLayout } from '@/features/admin/profile/components/EntityProfileLayout'
import layoutStyles from '@/features/admin/profile/components/EntityProfileLayout.module.css'
import {
  getProfileTabs,
  getBackRouteByContext,
} from '@/features/admin/profile/config/profileTabs.registry'
import type {
  EditableEntityValues,
  ProfileModuleContext,
  UnifiedEntityProfile,
} from '@/features/admin/profile/types/entityProfile.types'

import {
  getAdminStudent,
  updateAdminStudent,
  updateAdminStudentStatus,
} from '@/features/admin/api/adminStudentsApi'
import type { StudentDetail } from '@/features/admin/types/student.types'

function getInitials(firstNames?: string, lastNames?: string): string {
  const first = firstNames?.trim().charAt(0) ?? ''
  const last = lastNames?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'ES'
}

function mapStudentToUnifiedProfile(data: StudentDetail): UnifiedEntityProfile {
  const careerName =
    typeof data.career === 'object' && data.career !== null
      ? (data.career as { name: string }).name
      : (data.career as unknown as string)

  return {
    id: data.id,
    institutional_code: data.institutional_code,
    identity_number: (data as { identity_number?: string }).identity_number,
    first_names: data.first_names ?? '',
    last_names: data.last_names ?? '',
    email: data.email ?? '',
    status: data.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    role: 'STUDENT',
    career_name: careerName || 'No registrada',
  }
}

interface AdminStudentDetailPageProps {
  /** Permite forzar el contexto si se reutiliza desde el módulo "Usuarios" */
  forcedContext?: ProfileModuleContext
}

export function AdminStudentDetailPage({
  forcedContext,
}: AdminStudentDetailPageProps = {}) {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Detecta automáticamente si el administrador entró desde "/admin/users" o "/admin/students"
  const moduleContext: ProfileModuleContext =
    forcedContext ??
    (location.pathname.startsWith('/admin/users') ? 'users' : 'students')

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtenemos las pestañas configuradas para Estudiante en el contexto actual
  const availableTabs = useMemo(
    () => getProfileTabs('STUDENT', moduleContext),
    [moduleContext],
  )

  const requestedTab = searchParams.get('tab') || 'perfil'
  const [activeTabId, setActiveTabId] = useState<string>(
    availableTabs.some((t) => t.id === requestedTab) ? requestedTab : 'perfil',
  )

  useEffect(() => {
    if (!studentId) return
    let active = true

    async function fetchDetail() {
      try {
        setLoading(true)
        setError(null)
        const data = await getAdminStudent(studentId!)
        if (!active) return
        setStudent(data)
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
  }, [studentId])

  const handleOptionChange = (optionId: string) => {
    setActiveTabId(optionId)
    setSearchParams(optionId === 'perfil' ? {} : { tab: optionId }, {
      replace: true,
    })
  }

  // 2. FUNCIÓN ACTUALIZADA PARA MANEJAR TEXTO Y ESTADO
  const handleUpdateStudent = async (values: EditableEntityValues) => {
    if (!student) return
    let currentStudentData = { ...student }
    if (values.status !== student.status) {
      await updateAdminStudentStatus(student.id.toString(), values.status)
      currentStudentData.status = values.status
    }
    const hasTextChanges =
      values.first_names !== student.first_names ||
      values.last_names !== student.last_names ||
      values.email !== student.email

    if (hasTextChanges) {
      const textPayload = {
        first_names: values.first_names,
        last_names: values.last_names,
        email: values.email,
        institutional_code: student.institutional_code, 
      }
      
      const updatedDetail = await updateAdminStudent(student.id.toString(), textPayload)
      currentStudentData = updatedDetail
    }

    setStudent(currentStudentData)
  }

  const backRoute = getBackRouteByContext(moduleContext)

  if (loading) {
    return (
      <div className={layoutStyles.mainArea}>
        <div className={layoutStyles.sectionCard}>
          Cargando perfil del estudiante...
        </div>
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
            onClick={() => navigate(backRoute)}
          >
            Regresar
          </button>
        </div>
      </div>
    )
  }

  const unifiedEntity = mapStudentToUnifiedProfile(student)
  const fullName = `${unifiedEntity.first_names} ${unifiedEntity.last_names}`.trim()
  const initials = getInitials(unifiedEntity.first_names, unifiedEntity.last_names)

  const currentTabConfig =
    availableTabs.find((tab) => tab.id === activeTabId) ?? availableTabs[0]

  return (
    <EntityProfileLayout
      initials={initials}
      fullName={fullName}
      role={unifiedEntity.role}
      isActive={unifiedEntity.status === 'ACTIVE'}
      options={availableTabs}
      activeOptionId={currentTabConfig.id}
      onOptionChange={handleOptionChange}
      onBack={() => navigate(backRoute)}
    >
      {currentTabConfig.render({
        entity: unifiedEntity,
        moduleContext,
        onUpdateEntity: handleUpdateStudent,
        onNavigateTab: handleOptionChange,
      })}
    </EntityProfileLayout>
  )
}