import { UserIcon } from '@/features/auth/components/AuthIcons'
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage/AuthenticatedImage'
import type { EntryQrStudent } from '../types/entryQr.types'
import { entryStudentName } from '../utils/entryControlDisplay'
import styles from './EntryQr.module.css'

function IdentityPhoto({
  url,
  label,
  placeholder,
  name,
  revision,
}: {
  url: string | null | undefined
  label: string
  placeholder: string
  name: string
  revision?: number
}) {
  return (
    <figure className={styles.photo}>
      <div className={styles.avatar}>
        <AuthenticatedImage
          url={url}
          revision={revision}
          alt={`${label} de ${name}`}
          placeholder={
            <span
              className={styles.photoPlaceholder}
              role="img"
              aria-label={placeholder}
            >
              <UserIcon />
              <span>{placeholder}</span>
            </span>
          }
        />
      </div>
      <figcaption className={styles.photoLabel}>{label}</figcaption>
    </figure>
  )
}

export function EntryStudentPhotos({ student }: { student: EntryQrStudent }) {
  const name = entryStudentName(student)
  return (
    <div className={styles.identityPhotos}>
      <IdentityPhoto
        url={student.historical_photo_url}
        label="Foto histórica"
        placeholder="Sin fotografía histórica"
        name={name}
        revision={student.historical_photo_revision}
      />
      <IdentityPhoto
        url={student.profile_photo_url}
        label="Foto actual"
        placeholder="Sin fotografía actual"
        name={name}
      />
    </div>
  )
}

export function EntryQrStudentIdentity({
  student,
}: {
  student: EntryQrStudent
}) {
  const name = entryStudentName(student)
  return (
    <div className={styles.identity}>
      <EntryStudentPhotos student={student} />
      <div>
        <h3>{name}</h3>
        <p>SIS: {student.sis_code}</p>
        <p>CI: {student.identity_number || 'No informado'}</p>
      </div>
    </div>
  )
}
