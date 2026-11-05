import type { EntryControlExam } from '../types/entryControl.types'
import type { EvaluationType } from '../types/exam.types'
import styles from '../pages/EntryControlPage.module.css'

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Programado',
  ACTIVE: 'Activo',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Finalizado',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
}
const typeLabels: Record<EvaluationType, string> = {
  partial: 'Parcial',
  final: 'Final',
  makeup: '2da instancia',
}

export function EntryControlExamHeader({ exam }: { exam: EntryControlExam }) {
  const date = new Date(`${exam.exam_date}T00:00:00`)
  const room = exam.room
  const metadata = [
    exam.exam_date
      ? Number.isNaN(date.getTime())
        ? exam.exam_date
        : date.toLocaleDateString('es-BO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
      : null,
    exam.start_time?.split(':').slice(0, 2).join(':'),
    exam.duration_minutes != null ? `${exam.duration_minutes} min` : null,
    room
      ? [room.name, room.code ? `(${room.code})` : null]
          .filter(Boolean)
          .join(' ')
      : null,
    room?.location,
    exam.evaluation_type
      ? (typeLabels[exam.evaluation_type] ?? exam.evaluation_type)
      : null,
  ].filter(Boolean)

  return (
    <section
      className={styles.examHeader}
      aria-label="Examen en control de ingreso"
    >
      <div className={styles.examHeaderMain}>
        <h2>
          {[exam.subject_name, exam.name]
            .filter(
              (value, index, values) =>
                value && values.indexOf(value) === index,
            )
            .join(' · ')}
        </h2>
        {exam.status ? (
          <span className={styles.examStatus} data-status={exam.status}>
            {statusLabels[exam.status] ?? exam.status}
          </span>
        ) : null}
      </div>
      <p className={styles.examMetadata}>
        {metadata.map((value, index) => (
          <span key={index}>
            {index > 0 ? <span aria-hidden="true"> · </span> : null}
            {value}
          </span>
        ))}
      </p>
    </section>
  )
}
