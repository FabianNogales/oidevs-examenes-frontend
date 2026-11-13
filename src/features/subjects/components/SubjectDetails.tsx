import type { AdminSubject } from '../types/adminSubject.types'
import styles from './SubjectDialog.module.css'
import { Button } from '@/shared/components/ui/Button/Button'

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
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cerrar
        </Button>
        <Button onClick={onEdit}>
          Editar materia
        </Button>
      </footer>
    </>
  )
}
