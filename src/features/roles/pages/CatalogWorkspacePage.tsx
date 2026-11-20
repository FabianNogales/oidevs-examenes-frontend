import { useNavigate, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { AdminSubjectsPage } from '@/features/subjects/pages/AdminSubjectsPage'
import { SubjectDialog } from '@/features/subjects/components/SubjectDialog'
import { AdminAcademicTermsPage } from '@/features/academic-terms/pages/AdminAcademicTermsPage'
import { AcademicTermDialog } from '@/features/academic-terms/components/AcademicTermDialog'
import { AdminReadPage } from '@/features/users/pages/AdminReadPage'
import { AdminCourseOfferingsPage } from '@/features/course-offerings/pages/AdminCourseOfferingsPage'
import { DELEGATED_MODULES, getModuleAccess, type AcademicCatalog } from '../utils/moduleAccess'

export function CatalogWorkspacePage({ module, operation = 'access' }: {
  module: AcademicCatalog
  operation?: 'access' | 'create' | 'update'
}) {
  const { user, notify } = useAuth()
  const navigate = useNavigate()
  const { recordId } = useParams()
  const access = getModuleAccess(user, module)
  const definition = DELEGATED_MODULES.find((entry) => entry.key === module)!
  const home = user ? getHomeRouteForUser(user) : '/'
  const back = access.canView ? definition.path : home
  const close = () => navigate(back)
  const saved = () => {
    notify('success', 'Registro guardado correctamente.')
    close()
  }
  if (operation === 'access' && access.canView) {
    if (module === 'subjects') return <AdminSubjectsPage />
    if (module === 'academic_terms') return <AdminAcademicTermsPage />
    if (module === 'careers') return <AdminReadPage kind="careers" />
    return <AdminCourseOfferingsPage />
  }
  const creating = operation === 'create' || (operation === 'access' && access.canCreate)
  const writing = creating ? access.canCreate : operation === 'update' && access.canEdit
  const id = Number(recordId)
  const validId = Number.isSafeInteger(id) && id > 0
  const editor = !writing ? null : !creating && !validId ? <p role="alert">El identificador no es válido.</p>
    : module === 'subjects' ? <SubjectDialog key={creating ? 'create' : id}
      selection={creating ? { mode: 'create' } : { mode: 'edit', subjectId: id }} onClose={close} onSaved={saved} />
    : module === 'academic_terms' ? <AcademicTermDialog key={creating ? 'create' : id}
      selection={creating ? { mode: 'create' } : { mode: 'edit', termId: id }} onClose={close} onSaved={saved} />
    : null
  return (
    <PageContainer>
      <PageHeader title={definition.label} focusableTitle
        titleId={module === 'subjects' ? 'subjects-title' : module === 'academic_terms' ? 'academic-terms-title' : undefined}
        breadcrumbs={[
          { label: 'Inicio', to: access.isAdministrator ? '/admin' : home },
          { label: definition.label },
        ]} />
      {editor || <p role="status">{access.canEdit
        ? 'Puedes editar un registro desde su enlace de edición. Tu permiso no incluye consultar el listado.'
        : 'No tienes permiso vigente para esta operación.'}</p>}
    </PageContainer>
  )
}
