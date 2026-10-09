import { useEffect, useId, useRef, useState } from 'react'
import {
  getCollaborationError,
  searchCollaborationUsers,
} from '../api/collaborationsApi'
import type { CollaborationUser } from '../types/collaboration.types'
import { CollaborationModal } from './CollaborationModal'
import styles from '../pages/Collaborations.module.css'
import modalStyles from './AssignCollaboratorModal.module.css'

type Props = {
  examId: number
  assignedUserIds: number[]
  onClose: () => void
  onAssign: (userId: number) => Promise<void>
}

export function AssignCollaboratorModal({
  examId,
  assignedUserIds,
  onClose,
  onAssign,
}: Props) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<CollaborationUser[]>([])
  const [userId, setUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const [searchVersion, setSearchVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setUsers([])
    setUserId(null)
    setError(null)
    const timeout = window.setTimeout(() => {
      void searchCollaborationUsers(query, examId, controller.signal)
        .then((users) => {
          if (!controller.signal.aborted) {
            setUsers(users)
          }
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted)
            setError(
              getCollaborationError(
                cause,
                'No se pudieron consultar los usuarios.',
              ),
            )
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 300)
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [query, examId, searchVersion])

  async function assign() {
    if (
      userId === null ||
      loading ||
      assignedUserIds.includes(userId) ||
      !users.some((candidate) => candidate.id === userId) ||
      submitting.current
    ) {
      return
    }
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      await onAssign(userId)
    } catch (cause) {
      setError(
        getCollaborationError(cause, 'No se pudo asignar al colaborador.'),
      )
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <div className={modalStyles.modalScope}>
      <CollaborationModal
        title="Asignar colaborador"
        onClose={() => {
          if (!submitting.current) onClose()
        }}
        busy={busy}
      >
        <p className={modalStyles.description}>
          Selecciona un usuario registrado para autorizarlo temporalmente en este
          examen.
        </p>
        <div className={styles.search}>
          <label htmlFor={searchId}>Buscar usuario</label>
          <input
            id={searchId}
            type="search"
            placeholder="Buscar por nombre, CI o correo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={busy}
          />
        </div>
        <div
          className={`${styles.tableWrap} ${modalStyles.results}`}
          aria-busy={loading}
        >
          <table
            className={`${styles.table} ${modalStyles.resultsTable}`}
            aria-label="Usuarios registrados"
          >
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">CI</th>
                <th scope="col">Correo</th>
                <th scope="col">Seleccionar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((candidate) => (
                <tr key={candidate.id}>
                  <td>
                    <span
                      className={modalStyles.name}
                      title={candidate.display_name}
                    >
                      {candidate.display_name}
                    </span>
                  </td>
                  <td>
                    <span
                      className={modalStyles.identifier}
                      title={candidate.identity_number || undefined}
                    >
                      {candidate.identity_number || 'No informado'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={modalStyles.email}
                      title={candidate.email || undefined}
                    >
                      {candidate.email || 'No informado'}
                    </span>
                  </td>
                  <td>
                    <label className={modalStyles.radioTarget}>
                      <input
                        className={modalStyles.radio}
                        type="radio"
                        name={searchId}
                        aria-label={`Seleccionar a ${candidate.display_name}`}
                        checked={userId === candidate.id}
                        disabled={
                          busy || assignedUserIds.includes(candidate.id)
                        }
                        onChange={() => setUserId(candidate.id)}
                      />
                    </label>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.empty} role="status">
                    {loading
                      ? 'Consultando usuarios…'
                      : error
                        ? 'No se pudieron consultar los usuarios.'
                        : 'No se encontraron usuarios.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}{' '}
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy || loading}
              onClick={() => setSearchVersion((current) => current + 1)}
            >
              Reintentar
            </button>
          </p>
        ) : null}
        <p className={`${styles.note} ${modalStyles.note}`}>
          Puedes asignar usuarios activos como colaboradores. Los usuarios con
          inscripción estudiantil activa en la oferta de este examen no están
          disponibles. La autorización temporal no modifica ni reemplaza los roles
          permanentes del usuario.
        </p>
        <div className={`${styles.actions} ${modalStyles.actions}`}>
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
            className={styles.primaryButton}
            onClick={() => void assign()}
            disabled={busy || loading || userId === null}
          >
            {busy ? 'Asignando…' : 'Asignar'}
          </button>
        </div>
      </CollaborationModal>
    </div>
  )
}
