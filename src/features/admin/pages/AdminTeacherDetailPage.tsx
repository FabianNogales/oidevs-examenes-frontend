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
  getAdminTeacher,
  updateAdminTeacher,
} from '@/features/admin/api/adminTeachersApi'
import type { Teacher } from '@/features/admin/types/teacher.types'

function getInitials(firstNames?: string, lastNames?: string): string {
  const first = firstNames?.trim().charAt(0) ?? ''
  const last = lastNames?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'DO'
}

function mapTeacherToUnifiedProfile(data: Teacher): UnifiedEntityProfile {
  return {
    id: data.id,
    institutional_code: data.institutional_code,
    identity_number: data.identity_number,
    first_names: data.first_names ?? '',
    last_names: data.last_names ?? '',
    email: data.email ?? '',
    status: data.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    role: 'TEACHER',
  }
}

interface AdminTeacherDetailPageProps {
  forcedContext?: ProfileModuleContext
}

export function AdminTeacherDetailPage({
  forcedContext,
}: AdminTeacherDetailPageProps = {}) {
  const { teacherId } = useParams<{ teacherId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Detecta automáticamente si se ingresó desde "/admin/users" o desde "/admin/teachers"
  const moduleContext: ProfileModuleContext =
    forcedContext ??
    (location.pathname.startsWith('/admin/users') ? 'users' : 'teachers')

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtiene las 8 opciones laterales correspondientes al rol TEACHER
  const availableTabs = useMemo(
    () => getProfileTabs('TEACHER', moduleContext),
    [moduleContext],
  )

  const requestedTab = searchParams.get('tab') || 'perfil'
  const [activeTabId, setActiveTabId] = useState<string>(
    availableTabs.some((t) => t.id === requestedTab) ? requestedTab : 'perfil',
  )

  useEffect(() => {
    if (!teacherId) return
    let active = true

    async function fetchDetail() {
      try {
        setLoading(true)
        setError(null)
        const data = await getAdminTeacher(Number(teacherId))
        if (!active) return
        setTeacher(data)
      } catch (err) {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la información del docente.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchDetail()
    return () => {
      active = false
    }
  }, [teacherId])

  const handleOptionChange = (optionId: string) => {
    setActiveTabId(optionId)
    setSearchParams(optionId === 'perfil' ? {} : { tab: optionId }, {
      replace: true,
    })
  }

  /**
   * Conecta el guardado del formulario modular con updateAdminTeacher,
   * conservando los campos requeridos por TeacherFormValues.
   */
  const handleUpdateTeacher = async (values: EditableEntityValues) => {
    if (!teacher) return

    const updated = await updateAdminTeacher(teacher.id, {
      institutional_code: (values.institutional_code ?? teacher.institutional_code).trim(),
      identity_number: (values.identity_number ?? teacher.identity_number).trim(),
      first_names: values.first_names.trim(),
      last_names: values.last_names.trim(),
      email: values.email.trim().toLowerCase(),
    })

    setTeacher(updated)
  }

  const backRoute = getBackRouteByContext(moduleContext)

  if (loading) {
    return (
      <div className={layoutStyles.mainArea}>
        <div className={layoutStyles.sectionCard}>
          Cargando perfil del docente...
        </div>
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className={layoutStyles.mainArea}>
        <div className={layoutStyles.sectionCard} role="alert">
          <h2>Error al cargar docente</h2>
          <p>{error ?? 'No se encontró el registro solicitado.'}</p>
          <button
            type="button"
            className={layoutStyles.cancelBtn}
            onClick={() => navigate(backRoute)}
          >
            Regresar a gestión de docentes
          </button>
        </div>
      </div>
    )
  }

  const unifiedEntity = mapTeacherToUnifiedProfile(teacher)
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
        onUpdateEntity: handleUpdateTeacher,
        onNavigateTab: handleOptionChange,
      })}
    </EntityProfileLayout>
  )
}
