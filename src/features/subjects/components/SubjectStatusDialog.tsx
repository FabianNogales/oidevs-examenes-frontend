import { useRef, useState } from 'react'
import {
  SubjectApiError,
  updateAdminSubjectStatus,
} from '../api/subjectMutationsApi'
import type { AdminSubject } from '../types/adminSubject.types'
import { SubjectModal } from './SubjectModal'
import styles from './SubjectDialog.module.css'

export function SubjectStatusDialog({
  subject,
  onClose,
  onChanged,
}: {
  subject: AdminSubject
  onClose: () => void
  onChanged: (subject: AdminSubject) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const pending = useRef(false)
  const activating = subject.status === 'INACTIVE'
  function close() {
    if (!pending.current) onClose()
  }
  async function confirm() {
    if (pending.current || missing) return
    pending.current = true
    setSaving(true)
    setError(null)
    try {
      onChanged(
        await updateAdminSubjectStatus(
          subject.id,
          activating ? 'ACTIVE' : 'INACTIVE',
        ),
      )
    } catch (cause) {
      const error =
        cause instanceof SubjectApiError
          ? cause
          : new SubjectApiError('No se pudo cambiar el estado de la materia.')
      setError(error.message)
      setMissing(error.status === 404)
    } finally {
      pending.current = false
      setSaving(false)
    }
  }
  return (
    <SubjectModal
      title={activating ? 'Activar materia' : 'Desactivar materia'}
      busy={saving}
      onClose={close}
    >
      <p>
        <strong>
          {subject.code} · {subject.name || 'Sin nombre'}
        </strong>
      </p>
      <p className={styles.help}>
        {activating
          ? 'La materia volverá a estar habilitada para crear nuevas ofertas académicas.'
          : 'La materia dejará de estar habilitada para crear nuevas ofertas académicas.'}
      </p>
      <p className={styles.help}>
        Los exámenes relacionados y su historial se conservarán.
      </p>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <footer className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={saving}
          onClick={close}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={saving || missing}
          onClick={() => void confirm()}
        >
          {saving
            ? 'Procesando…'
            : activating
              ? 'Sí, activar'
              : 'Sí, desactivar'}
        </button>
      </footer>
    </SubjectModal>
  )
}
