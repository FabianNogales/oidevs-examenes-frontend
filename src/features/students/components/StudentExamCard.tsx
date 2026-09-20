import type { ReactNode } from 'react'
import { ExamSchedule } from '@/features/students/components/ExamSchedule'
import { StudentQrIcon } from '@/features/students/components/StudentQrIcon'
import type { StudentExam } from '@/features/students/types/studentQr'
import styles from '@/features/students/pages/StudentQrPage.module.css'

interface StudentExamCardProps {
  exam: StudentExam
  selected: boolean
  onSelect: (examId: number) => void
  children?: ReactNode
}

export function StudentExamCard({
  exam,
  selected,
  onSelect,
  children,
}: StudentExamCardProps) {
  const qrAvailable = exam.qr_status === 'AVAILABLE'
  const status = {
    UPCOMING: {
      style: styles.unavailable,
      icon: 'clock' as const,
      title: 'QR no disponible',
      detail: 'Disponible 24 h antes del examen',
    },
    AVAILABLE: {
      style: styles.available,
      icon: 'check' as const,
      title: 'QR disponible',
      detail: 'Válido hasta el final del examen',
    },
    FINISHED: {
      style: styles.finished,
      icon: 'clock' as const,
      title: 'Examen finalizado',
      detail: 'QR no disponible para ingreso',
    },
  }[exam.qr_status]

  return (
    <article
      className={`${styles.examCard} ${selected ? styles.selected : ''}`}
    >
      <div className={styles.examDetails}>
        <div className={styles.cardHeading}>
          <p className={styles.subject}>{exam.subject}</p>
          {selected && (
            <span className={styles.selectionBadge}>
              <StudentQrIcon name="check" />
              Seleccionado
            </span>
          )}
        </div>
        <h3>{exam.exam_title}</h3>
      </div>
      <p className={styles.schedule}>
        <StudentQrIcon name="calendar" />
        <span>
          <span className={styles.fieldLabel}>Fecha y hora</span>
          <ExamSchedule scheduledAt={exam.scheduled_at} />
        </span>
      </p>
      <div className={styles.examActions}>
        <div
          id={`exam-${exam.exam_id}-availability`}
          className={`${styles.statusBadge} ${status.style}`}
        >
          <StudentQrIcon name={status.icon} />
          <span>
            <strong>{status.title}</strong>
            <span className={styles.statusDetail}>{status.detail}</span>
          </span>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={!qrAvailable}
          aria-describedby={`exam-${exam.exam_id}-availability`}
          aria-pressed={selected}
          aria-controls={selected ? `exam-${exam.exam_id}-qr` : undefined}
          aria-expanded={selected}
          aria-label={`Ver QR: ${exam.subject}, ${exam.exam_title}`}
          onClick={() => onSelect(exam.exam_id)}
        >
          <StudentQrIcon name="qr" />
          Ver QR
        </button>
      </div>
      {children}
    </article>
  )
}
