import { ExamSchedule } from '@/features/students/components/ExamSchedule'
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
      <p className={styles.subject}>{exam.subject_name}</p>
      <h3>{exam.exam_title}</h3>
      <p className={styles.muted}>
        <ExamSchedule scheduledAt={exam.scheduled_at} />
      </p>
      <p className={exam.is_qr_available ? styles.available : styles.muted}>
        {exam.is_qr_available
          ? 'QR disponible'
          : 'QR disponible 24 horas antes del examen'}
      </p>
      <button
        type="button"
        className={styles.primaryButton}
        disabled={!exam.is_qr_available}
        aria-pressed={selected}
        aria-controls="student-exam-qr"
        aria-label={`Ver QR: ${exam.subject_name}, ${exam.exam_title}`}
        onClick={() => onSelect(exam.exam_id)}
      >
        Ver QR
      </button>
    </article>
  )
}
