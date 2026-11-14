import type { ReactNode } from 'react'
import { ExamSchedule } from '@/features/students/components/ExamSchedule'
import { StudentQrIcon } from '@/features/students/components/StudentQrIcon'
import type { StudentExam, StudentQrVersion } from '@/features/students/types/studentQr'
import styles from '@/features/students/pages/StudentQrPage.module.css'

interface StudentExamCardProps {
  exam: StudentExam
  selectedVersion: StudentQrVersion | null
  onSelect: (examId: number, version: StudentQrVersion) => void
  children?: ReactNode
}

export function StudentExamCard({
  exam,
  selectedVersion,
  onSelect,
  children,
}: StudentExamCardProps) {
  const qrAvailable = exam.qr_status === 'AVAILABLE'
  const selected = selectedVersion !== null
  const status = {
    PENDING_ELIGIBILITY: {
      style: styles.unavailable,
      icon: 'clock' as const,
      title: 'Habilitación pendiente',
      detail: 'QR no disponible todavía',
    },
    NOT_ELIGIBLE: {
      style: styles.unavailable,
      icon: 'info' as const,
      title: 'No habilitado',
      detail: 'QR no disponible para este examen',
    },
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
      icon: 'error' as const,
      title: 'Examen finalizado',
      detail: 'QR no disponible para ingreso',
    },
  }[exam.qr_status]

  return (
    <article
      className={`${styles.examCard} ${selected ? styles.selected : ''}`}
    >
      <div className={styles.examSubject}>
        <p className={styles.subject}>{exam.subject}</p>
      </div>
      <div className={styles.examDetails}>
        <h3>{exam.exam_title}</h3>
        {selected && (
          <span className={styles.selectionBadge}>
            <StudentQrIcon name="check" />
            Seleccionado
          </span>
        )}
      </div>
      <p className={styles.schedule}>
        <StudentQrIcon name="calendar" />
        <span>
          <span className={styles.fieldLabel}>Fecha y hora</span>
          <ExamSchedule scheduledAt={exam.scheduled_at} />
        </span>
      </p>
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
      <div className={styles.qrActions}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={!qrAvailable}
          aria-describedby={`exam-${exam.exam_id}-availability`}
          aria-controls={selectedVersion === 3 ? `exam-${exam.exam_id}-qr` : undefined}
          aria-expanded={selectedVersion === 3}
          onClick={() => onSelect(exam.exam_id, 3)}
        >
          QR para EIDA Control
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={!qrAvailable}
          aria-describedby={`exam-${exam.exam_id}-availability`}
          aria-controls={selectedVersion === 2 ? `exam-${exam.exam_id}-qr` : undefined}
          aria-expanded={selectedVersion === 2}
          onClick={() => onSelect(exam.exam_id, 2)}
        >
          QR para control web
        </button>
      </div>
      {children}
    </article>
  )
}
