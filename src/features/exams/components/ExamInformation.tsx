import { examDisplayStatus, examStatusLabel } from '../utils/examDisplayStatus'
import type { ManagedExam } from '../api/examManagementApi'
import styles from './ExamInformation.module.css'

const evaluationLabels = {
  partial: 'Parcial',
  final: 'Final',
  makeup: '2da instancia',
}

export function ExamInformation({ exam }: { exam: ManagedExam }) {
  const displayStatus = examDisplayStatus(exam)
  const parsed = new Date(`${exam.exam_date}T00:00:00`)
  const date = Number.isNaN(parsed.getTime())
    ? exam.exam_date
    : parsed.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
  const fields = [
    {
      label: 'Hora de inicio',
      value: exam.start_time?.slice(0, 5) || 'No disponible',
      detail: 'Hora de Bolivia · UTC−4',
    },
    {
      label: 'Duración',
      value:
        exam.duration_minutes != null
          ? `${exam.duration_minutes} minutos`
          : 'No disponible',
    },
    {
      label: 'Tipo de evaluación',
      value: exam.evaluation_type
        ? evaluationLabels[exam.evaluation_type]
        : 'No disponible',
    },
    {
      label: 'Ambiente',
      value: exam.room?.name || exam.room?.code || 'No disponible',
      detail: exam.room?.name ? exam.room.code : null,
    },
    {
      label: 'Periodo académico',
      value: exam.academic_term_name || 'No disponible',
    },
  ]
  return (
    <section className={styles.panel} aria-labelledby="exam-information-title">
      <header className={styles.header}>
        <h2 id="exam-information-title">Resumen de la evaluación</h2>
        <span className={styles.status} data-status={displayStatus}>
          {examStatusLabel(displayStatus)}
        </span>
      </header>
      <div className={styles.summary}>
        <div className={styles.datePanel}>
          <div className={styles.dateHeading}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 11h18M8 15h3M8 18h6" />
            </svg>
            <span>Fecha del examen</span>
          </div>
          <time dateTime={exam.exam_date}>{date}</time>
          {!Number.isNaN(parsed.getTime()) && (
            <span className={styles.weekday}>
              {parsed.toLocaleDateString('es-BO', { weekday: 'long' })}
            </span>
          )}
        </div>
        <dl className={styles.grid}>
          {fields.map(({ label, value, detail }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {value}
                {detail && <small>{detail}</small>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
