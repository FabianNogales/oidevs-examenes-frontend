import { useNavigate, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { RoomDialog } from '../components/RoomDialog'
import { RoomForm } from '../components/RoomForm'
import { getRoomAccess } from '../utils/roomAccess'
import type { Room } from '../types/room.types'
import styles from './AdminRoomsPage.module.css'

export function RoomWritePage({ mode }: { mode: 'create' | 'edit' }) {
  const { user, notify } = useAuth()
  const navigate = useNavigate()
  const { roomId } = useParams()
  const access = getRoomAccess(user)
  const id = Number(roomId)
  const home = user ? getHomeRouteForUser(user) : '/'
  const back = access.canView ? '/admin/rooms' : home
  const allowed = mode === 'create' ? access.canCreate : access.canEdit
  function close() {
    navigate(back)
  }

  function saved(room: Room) {
    notify('success', `Aula ${room.code} ${mode === 'create' ? 'registrada' : 'actualizada'} correctamente.`)
    navigate(back)
  }
  return (
    <PageContainer>
      <PageHeader title={mode === 'create' ? 'Registrar aula' : 'Editar aula'}
        breadcrumbs={[
          { label: 'Inicio', to: access.isAdministrator ? '/admin' : home },
          { label: 'Aulas', to: access.canView ? '/admin/rooms' : undefined },
          { label: mode === 'create' ? 'Registrar aula' : 'Editar aula' },
        ]} />
      {!allowed ? (
        <p role="alert">No tienes permiso vigente para esta operación.</p>
      ) : mode === 'create' ? (
        <div className={styles.card}>
          <RoomForm onCancel={close} onSaved={saved} onBusyChange={() => {}} />
        </div>
      ) : Number.isSafeInteger(id) && id > 0 ? (
        <RoomDialog key={id} selection={{ mode: 'edit', roomId: id }}
          canView={access.canView} canCreate={access.canCreate} canEdit={access.canEdit}
          onClose={close} onSaved={saved} />
      ) : <p role="alert">El identificador del aula no es válido.</p>}
    </PageContainer>
  )
}
