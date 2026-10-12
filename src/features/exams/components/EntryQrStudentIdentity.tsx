import { useState } from 'react'
import { UserIcon } from '@/features/auth/components/AuthIcons'
import type { EntryQrStudent } from '../types/entryQr.types'
import { entryStudentName } from '../utils/entryControlDisplay'
import styles from './EntryQr.module.css'

export function EntryQrStudentIdentity({
  student,
}: {
  student: EntryQrStudent
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const url = student.profile_photo_url?.trim()
  return (
    <div className={styles.identity}>
      <div className={styles.avatar}>
        {url && failedUrl !== url ? (
          <img
            src={url}
            alt={`Fotografía de ${entryStudentName(student)}`}
            onError={() => setFailedUrl(url)}
          />
        ) : (
          <span role="img" aria-label="Sin fotografía de perfil">
            <UserIcon />
          </span>
        )}
      </div>
      <div>
        <h3>{entryStudentName(student)}</h3>
        <p>SIS: {student.sis_code}</p>
        <p>CI: {student.identity_number || 'No informado'}</p>
      </div>
    </div>
  )
}
