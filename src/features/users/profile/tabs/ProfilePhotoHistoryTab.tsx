import { ImageOff } from 'lucide-react'
import { EmptyState, Icon, Stack, Text } from '@/shared/components/ui/index'
import { ProfilePhotoCard } from '../components/ProfilePhotoCard'
import photoStyles from '../components/ProfilePhotoCard.module.css'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

const ROLE_ARTICLE_LABEL = {
  STUDENT: 'el estudiante',
  TEACHER: 'el docente',
  ADMIN: 'el administrador',
} as const

/** Pestaña de solo lectura: muestra las fotografías registradas de la entidad. */
export function ProfilePhotoHistoryTab({ entity }: ProfileTabComponentProps) {
  const photos = entity.photos ?? []
  const ownerName = `${entity.first_names} ${entity.last_names}`.trim()
  const roleLabel = ROLE_ARTICLE_LABEL[entity.role]

  return (
    <Stack direction="vertical" gap="4">
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <Text variant="body" tone="primary">
            Fotografías registradas de {roleLabel}, desde la foto actual hasta
            las anteriores.
          </Text>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className={photoStyles.photoGrid}>
          {photos.map((photo) => (
            <ProfilePhotoCard
              key={photo.id}
              photo={photo}
              ownerName={ownerName}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Icon icon={ImageOff} size="lg" />}
          title="Sin fotografías registradas"
          description={`No existen fotografías registradas para ${roleLabel}.`}
        />
      )}
    </Stack>
  )
}
