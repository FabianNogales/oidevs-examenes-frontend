import type { Subject } from '@/features/subjects/types/subject.types'

import styles from './SubjectCard.module.css'

interface SubjectCardProps {
  subject: Subject
  onAddStudents?: (subject: Subject) => void
  showCreateExam?: boolean
}

export function SubjectCard({
  subject,
  onAddStudents,
  showCreateExam = true,
}: SubjectCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.subjectInfo}>
        <span className={styles.label}>Codigo</span>
        <strong className={styles.code}>{subject.code}</strong>
      </div>

      <div className={styles.subjectInfo}>
        <span className={styles.label}>Materia</span>
        <strong>{subject.name}</strong>
      </div>

      <div className={styles.subjectInfo}>
        <span className={styles.label}>Gestion academica</span>
        <span>{subject.academicManagement}</span>
      </div>

      <div className={styles.actions} aria-label={`Acciones para ${subject.name}`}>
        {showCreateExam ? (
          <button type="button" disabled title="Disponible en HU08">
            Crear examen
          </button>
        ) : null}
        <button
          type="button"
          title="Gestionar estudiantes"
          onClick={onAddStudents ? () => onAddStudents(subject) : undefined}
          disabled={!onAddStudents}
        >
          {onAddStudents ? 'Gestionar estudiantes' : 'Agregar estudiantes'}
        </button>
      </div>
    </article>
  )
}