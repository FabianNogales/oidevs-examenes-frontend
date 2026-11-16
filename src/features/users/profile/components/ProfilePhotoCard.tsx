import { ImageOff } from 'lucide-react'
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage/AuthenticatedImage'
import { Icon } from '@/shared/components/ui/index'
import type {
  ProfilePhotoRecord,
  ProfilePhotoStatus,
} from '../types/entityProfile.types'
import styles from './ProfilePhotoCard.module.css'

const STATUS_PRESENTATION: Record<
  ProfilePhotoStatus,
  { label: string; className: string }
> = {
  INSTITUTIONAL: {
    label: 'Foto institucional',
    className: styles.statusInstitutional,
  },
  CURRENT: { label: 'Foto actual', className: styles.statusCurrent },
  PREVIOUS: { label: 'Foto anterior', className: styles.statusPrevious },
}

interface ProfilePhotoCardProps {
  photo: ProfilePhotoRecord
  ownerName: string
}

/** Tarjeta 1:1 de una fotografía con su estado (actual / anterior). */
export function ProfilePhotoCard({ photo, ownerName }: ProfilePhotoCardProps) {
  const status = STATUS_PRESENTATION[photo.status]

  return (
    <article className={styles.photoCard}>
      <div className={styles.photoFrame}>
        <AuthenticatedImage
          url={photo.url}
          revision={photo.revision}
          alt={`${status.label} de ${ownerName}`}
          className={styles.photoImage}
          placeholder={
            <span className={styles.photoPlaceholder}>
              <Icon icon={ImageOff} size="lg" />
              <span>Sin fotografía</span>
            </span>
          }
        />
      </div>

      <span className={`${styles.statusLabel} ${status.className}`}>
        {status.label}
      </span>
    </article>
  )
}
