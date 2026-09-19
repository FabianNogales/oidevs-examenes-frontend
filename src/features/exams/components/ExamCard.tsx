import type { EvaluationType } from '@/features/exams/types/exam.types'

import styles from './ExamCard.module.css'

type ExamCardProps = {
  subjectCode: string
  subjectName: string
  examName: string
  examDate: string
  examTime: string
  durationMinutes: number
  roomName: string
  roomCode: string
  evaluationType: EvaluationType
  status: string
}

const EVALUATION_LABELS: Record<EvaluationType, string> = {
  partial: 'Parcial',
  final: 'Final',
  makeup: 'Recuperatorio',
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programado',
}

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(value: string): string {
  return value.includes(':') ? value.split(':').slice(0, 2).join(':') : value
}

export function ExamCard({
  subjectCode,
  subjectName,
  examName,
  examDate,
  examTime,
  durationMinutes,
  roomName,
  roomCode,
  evaluationType,
  status,
}: ExamCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.subjectInfo}>
          <h3>{subjectName}</h3>
          <span>{subjectCode}</span>
        </div>

        <span className={styles.badge}>{STATUS_LABELS[status] ?? status}</span>
      </div>

      <div className={styles.examNameWrap}>
        <p>{examName}</p>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.itemContent}>
            <span className={styles.label}>Fecha</span>
            <strong>{formatDate(examDate)}</strong>
          </div>
        </div>

        <div className={styles.infoItem}>
          <div className={styles.itemContent}>
            <span className={styles.label}>Hora</span>
            <strong>{formatTime(examTime)}</strong>
          </div>
        </div>

        <div className={styles.infoItem}>
          <div className={styles.itemContent}>
            <span className={styles.label}>Duración</span>
            <strong>{durationMinutes} min</strong>
          </div>
        </div>

        <div className={styles.infoItem}>
          <div className={styles.itemContent}>
            <span className={styles.label}>Ambiente</span>
            <strong>{roomName}</strong>
            <small>{roomCode}</small>
          </div>
        </div>

        <div className={styles.infoItem}>
          <div className={styles.itemContent}>
            <span className={styles.label}>Tipo</span>
            <strong>{EVALUATION_LABELS[evaluationType] ?? evaluationType}</strong>
          </div>
        </div>
      </div>
    </article>
  )
}
