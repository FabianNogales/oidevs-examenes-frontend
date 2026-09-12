import { ExamSchedule } from '@/features/students/components/ExamSchedule'
import { StudentQrIcon } from '@/features/students/components/StudentQrIcon'
import type { StudentExam } from '@/features/students/types/studentQr'
import styles from '@/features/students/pages/StudentQrPage.module.css'

interface StudentExamCardProps {
  exam: StudentExam
  selected: boolean
  onSelect: (examId: number) => void
}

export function StudentExamCard({
  exam,
  selected,
  onSelect,
}: StudentExamCardProps) {
  return (
    <article
      className={`${styles.examCard} ${selected ? styles.selected : ''}`}
    >
      <div className={styles.cardHeading}>
        <p className={styles.subject}>{exam.subject_name}</p>
        {selected && (
          <span className={styles.selectionBadge}>
            <StudentQrIcon name="check" />
            Seleccionado
          </span>
        )}
      </div>
      <h3>{exam.exam_title}</h3>
      <p className={styles.schedule}>
        <StudentQrIcon name="calendar" />
        <span>
          <span className={styles.fieldLabel}>Fecha y hora</span>
          <ExamSchedule scheduledAt={exam.scheduled_at} />
        </span>
      </p>
      <p
        className={`${styles.statusBadge} ${exam.is_qr_available ? styles.available : styles.unavailable}`}
      >
        <StudentQrIcon name={exam.is_qr_available ? 'check' : 'clock'} />
        {exam.is_qr_available
          ? 'QR disponible'
          : 'Disponible 24 h antes del examen'}
      </p>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={!exam.is_qr_available}
        aria-pressed={selected}
        aria-controls="student-exam-qr"
        aria-label={`Ver QR: ${exam.subject_name}, ${exam.exam_title}`}
        onClick={() => onSelect(exam.exam_id)}
      >
        <StudentQrIcon name="qr" />
        Ver QR
      </button>
    </article>
  )
}
