import { useAuth } from '@/features/auth/hooks/useAuth'
import { getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { getRoomAccess } from '../utils/roomAccess'
import { AdminRoomsPage } from './AdminRoomsPage'
import { RoomWritePage } from './RoomWritePage'

export function RoomWorkspacePage() {
  const { user } = useAuth()
  const access = getRoomAccess(user)
  if (access.canView) return <AdminRoomsPage />
  if (access.canCreate) return <RoomWritePage mode="create" />
  return (
    <PageContainer>
      <PageHeader title="Aulas" breadcrumbs={[
        { label: 'Inicio', to: user ? getHomeRouteForUser(user) : '/' }, { label: 'Aulas' },
      ]} />
      <p role="status">{access.canEdit
        ? 'Puedes editar un aula desde su enlace de edición. Tu permiso no incluye consultar el listado de aulas.'
        : 'No tienes permisos vigentes para la gestión de aulas.'}</p>
    </PageContainer>
  )
}
