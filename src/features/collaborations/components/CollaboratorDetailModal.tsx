import { useState } from 'react'
import { UserIcon } from '@/features/auth/components/AuthIcons'
import type { ExamCollaborator } from '../types/collaboration.types'
import { formatAssignmentDate } from '../utils/collaborationFormat'
import { CollaborationModal } from './CollaborationModal'
import styles from '../pages/Collaborations.module.css'
import detailStyles from './CollaboratorDetailModal.module.css'

type Props = {
  collaborator: ExamCollaborator
  examName: string
  onClose: () => void
}

export function CollaboratorDetailModal({
  collaborator,
  examName,
  onClose,
}: Props) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null)
  const photoUrl = collaborator.profile_photo_url

  return (
    <CollaborationModal title="Detalle del colaborador" onClose={onClose}>
      <section className={detailStyles.summary} aria-label="Datos del colaborador">
        <div className={detailStyles.avatar} aria-hidden="true">
          {photoUrl && photoUrl.trim() && failedPhotoUrl !== photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              onError={() => setFailedPhotoUrl(photoUrl)}
            />
          ) : (
            <UserIcon />
          )}
        </div>
        <dl className={`${styles.details} ${detailStyles.primaryDetails}`}>
          <dt>Colaborador</dt>
          <dd>{collaborator.display_name}</dd>
          <dt>CI</dt>
          <dd>{collaborator.identity_number || 'No informado'}</dd>
          <dt>Correo</dt>
          <dd>{collaborator.email || 'No informado'}</dd>
          <dt>Examen</dt>
          <dd>{examName}</dd>
          <dt>Fecha de asignación</dt>
          <dd>{formatAssignmentDate(collaborator.assigned_at)}</dd>
          <dt>Asignado por</dt>
          <dd>{collaborator.assigned_by_name || 'No informado'}</dd>
        </dl>
      </section>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </CollaborationModal>
  )
}
