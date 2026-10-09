import type { ReactNode } from 'react'
import type { EvaluationType } from '@/features/exams/types/exam.types'

import styles from './ExamCard.module.css'

type ExamCardProps = {
  subjectCode?: string | null
  subjectName?: string | null
  examName: string
  examDate: string
  examTime?: string | null
  durationMinutes?: number | null
  roomName?: string | null
  roomCode?: string | null
  evaluationType?: EvaluationType | null
  status?: string | null
  children?: ReactNode
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
  children,
}: ExamCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.subjectInfo}>
          <h3>{subjectName || examName}</h3>
          {subjectCode ? <span>{subjectCode}</span> : null}
        </div>

        {status ? (
          <span className={styles.badge}>
            {STATUS_LABELS[status] ?? status}
          </span>
        ) : null}
      </div>

      {subjectName ? (
        <div className={styles.examNameWrap}>
          <p>{examName}</p>
        </div>
      ) : null}

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.itemContent}>
            <span className={styles.label}>Fecha</span>
            <strong>{formatDate(examDate)}</strong>
          </div>
        </div>

        {examTime ? (
          <div className={styles.infoItem}>
            <div className={styles.itemContent}>
              <span className={styles.label}>Hora</span>
              <strong>{formatTime(examTime)}</strong>
            </div>
          </div>
        ) : null}

        {durationMinutes != null ? (
          <div className={styles.infoItem}>
            <div className={styles.itemContent}>
              <span className={styles.label}>Duración</span>
              <strong>{durationMinutes} min</strong>
            </div>
          </div>
        ) : null}

        {roomName || roomCode ? (
          <div className={styles.infoItem}>
            <div className={styles.itemContent}>
              <span className={styles.label}>Ambiente</span>
              {roomName ? <strong>{roomName}</strong> : null}
              {roomCode ? <small>{roomCode}</small> : null}
            </div>
          </div>
        ) : null}

        {evaluationType ? (
          <div className={styles.infoItem}>
            <div className={styles.itemContent}>
              <span className={styles.label}>Tipo</span>
              <strong>
                {EVALUATION_LABELS[evaluationType] ?? evaluationType}
              </strong>
            </div>
          </div>
        ) : null}
      </div>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </article>
  )
}
