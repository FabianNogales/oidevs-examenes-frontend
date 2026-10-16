import type { AdminSubject } from '../types/adminSubject.types'
import styles from './SubjectDialog.module.css'

export function SubjectDetails({
  subject,
  onClose,
  onEdit,
}: {
  subject: AdminSubject
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <>
      <dl className={styles.details}>
        <div>
          <dt>Código</dt>
          <dd>{subject.code}</dd>
        </div>
        <div>
          <dt>Nombre</dt>
          <dd>{subject.name}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{subject.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</dd>
        </div>
        <div className={styles.fullWidth}>
          <dt>Carreras</dt>
          <dd>
            {subject.careers.length
              ? subject.careers.map((career) => (
                  <p key={career.id}>
                    {career.name}
                    {career.status === 'INACTIVE' ? ' (inactiva)' : ''}
                  </p>
                ))
              : 'Sin carreras asociadas'}
          </dd>
        </div>
      </dl>
      <footer className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onClose}
        >
          Cerrar
        </button>
        <button type="button" className={styles.primaryButton} onClick={onEdit}>
          Editar materia
        </button>
      </footer>
    </>
  )
}
