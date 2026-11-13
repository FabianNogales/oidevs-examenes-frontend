import type { AcademicTerm } from '../types/academicTerm.types'
import { formatAcademicTermDate } from '../utils/academicTermDate'
import { AcademicTermStatusBadge } from './AcademicTermStatusBadge'
import styles from './AcademicTermModal.module.css'
import { Button } from '@/shared/components/ui/Button/Button'

export function AcademicTermDetails({
  term,
  onClose,
  onEdit,
}: {
  term: AcademicTerm
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <>
      <dl className={styles.details}>
        <div className={styles.fullWidth}>
          <dt>Nombre del periodo</dt>
          <dd>{term.name}</dd>
        </div>
        <div>
          <dt>Fecha de inicio</dt>
          <dd>
            <time dateTime={term.start_date}>
              {formatAcademicTermDate(term.start_date)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Fecha de fin</dt>
          <dd>
            <time dateTime={term.end_date}>
              {formatAcademicTermDate(term.end_date)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <AcademicTermStatusBadge status={term.status} />
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
          Editar periodo
        </Button>
      </footer>
    </>
  )
}
