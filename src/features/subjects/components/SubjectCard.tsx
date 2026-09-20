import type { Subject } from '@/features/subjects/types/subject.types'

import styles from './SubjectCard.module.css'

interface SubjectCardProps {
  subject: Subject
  onAddStudents?: (subject: Subject) => void
  onCreateExam?: (subject: Subject) => void
  showCreateExam?: boolean
}

export function SubjectCard({
  subject,
  onAddStudents,
  onCreateExam,
  showCreateExam = true,
}: SubjectCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.subjectInfo}>
        <span className={styles.label}>Codigo</span>
        <strong className={styles.code}>{subject.code ?? 'No disponible'}</strong>
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
          <button
            type="button"
            onClick={() => onCreateExam?.(subject)}
            title="Crear examen"
          >
            Crear examen
          </button>
        ) : null}
        {onAddStudents ? (
          <button
            type="button"
            title="Gestionar estudiantes"
            onClick={() => onAddStudents(subject)}
          >
            Gestionar estudiantes
          </button>
        ) : null}
      </div>
    </article>
  )
}
