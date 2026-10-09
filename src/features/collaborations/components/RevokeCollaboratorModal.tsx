import { useRef, useState } from 'react'
import { getCollaborationError } from '../api/collaborationsApi'
import type { ExamCollaborator } from '../types/collaboration.types'
import { CollaborationModal } from './CollaborationModal'
import styles from '../pages/Collaborations.module.css'

type Props = {
  collaborator: ExamCollaborator
  onClose: () => void
  onRevoke: () => Promise<void>
}

export function RevokeCollaboratorModal({
  collaborator,
  onClose,
  onRevoke,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  async function revoke() {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      await onRevoke()
    } catch (cause) {
      setError(
        getCollaborationError(cause, 'No se pudo revocar la autorización.'),
      )
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  return (
    <CollaborationModal
      title="Revocar autorización"
      onClose={() => {
        if (!submitting.current) onClose()
      }}
      busy={busy}
    >
      <p>
        ¿Estás seguro de que deseas revocar la autorización de{' '}
        <strong>{collaborator.display_name}</strong> para este examen?
      </p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onClose}
          disabled={busy}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={() => void revoke()}
          disabled={busy}
        >
          {busy ? 'Revocando…' : 'Revocar'}
        </button>
      </div>
    </CollaborationModal>
  )
}
