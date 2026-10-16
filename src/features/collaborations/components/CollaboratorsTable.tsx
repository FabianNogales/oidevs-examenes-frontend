import type { ExamCollaborator } from '../types/collaboration.types'
import {
  formatAssignmentDate,
  formatAssignmentDateCompact,
} from '../utils/collaborationFormat'
import styles from '../pages/Collaborations.module.css'

type Props = {
  collaborators: ExamCollaborator[]
  emptyMessage: string
  loading: boolean
  onView: (collaborator: ExamCollaborator) => void
  onRevoke: (collaborator: ExamCollaborator) => void
}

export function CollaboratorsTable({
  collaborators,
  emptyMessage,
  loading,
  onView,
  onRevoke,
}: Props) {
  return (
    <div
      className={`${styles.tableWrap} ${styles.collaboratorsTableWrap}`}
      aria-busy={loading}
    >
      <table
        className={`${styles.table} ${styles.collaboratorsTable}`}
        aria-label="Colaboradores asignados"
      >
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Colaborador</th>
            <th scope="col">CI</th>
            <th scope="col">Correo</th>
            <th scope="col">Fecha de asignación</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {collaborators.map((collaborator, index) => (
            <tr key={collaborator.id}>
              <td>{index + 1}</td>
              <td>{collaborator.display_name}</td>
              <td>{collaborator.identity_number || 'No informado'}</td>
              <td>
                <span
                  className={styles.collaboratorEmail}
                  title={collaborator.email || undefined}
                >
                  {collaborator.email || 'No informado'}
                </span>
              </td>
              <td title={formatAssignmentDate(collaborator.assigned_at)}>
                {formatAssignmentDateCompact(collaborator.assigned_at)}
              </td>
              <td>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => onView(collaborator)}
                    aria-label={`Ver a ${collaborator.display_name}`}
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => onRevoke(collaborator)}
                    aria-label={`Revocar autorización de ${collaborator.display_name}`}
                  >
                    Revocar
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {collaborators.length === 0 ? (
            <tr>
              <td colSpan={6} className={styles.empty} role="status">
                {loading ? 'Cargando colaboradores…' : emptyMessage}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
