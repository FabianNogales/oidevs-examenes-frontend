import { useRef } from 'react'
import { StudentExamCard } from '@/features/students/components/StudentExamCard'
import { StudentQrCard } from '@/features/students/components/StudentQrCard'
import { StudentQrIcon } from '@/features/students/components/StudentQrIcon'
import { useStudentExams } from '@/features/students/hooks/useStudentExams'
import { useStudentQr } from '@/features/students/hooks/useStudentQr'
import styles from './StudentQrPage.module.css'

export function StudentQrPage() {
  const exams = useStudentExams()
  const qr = useStudentQr()
  const qrSectionRef = useRef<HTMLElement>(null)
  const selectedExam = exams.data.find((exam) => exam.exam_id === qr.examId)

  function selectExam(examId: number) {
    const exam = exams.data.find((item) => item.exam_id === examId)

    if (!exam?.is_qr_available) return

    qr.select(exam)
    qrSectionRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    })
  }

  function refreshExams() {
    qr.clear()
    exams.retry()
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerIcon}>
          <StudentQrIcon name="qr" />
        </span>
        <div>
          <h1>Mis exámenes</h1>
          <p>
            Consulta tus exámenes programados y accede a tu código QR cuando
            esté disponible.
          </p>
        </div>
      </header>

      <div className={styles.notice}>
        <StudentQrIcon name="info" />
        <p>
          El código QR se habilita 24 horas antes de la fecha y hora programadas
          del examen.
        </p>
      </div>

      <section
        className={styles.examsPanel}
        aria-labelledby="student-exams-heading"
        aria-busy={exams.loading}
      >
        <div className={styles.sectionHeading}>
          <h2 id="student-exams-heading">
            <StudentQrIcon name="calendar" />
            Exámenes programados
          </h2>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={refreshExams}
            disabled={exams.loading}
          >
            <StudentQrIcon name="refresh" />
            Actualizar exámenes
          </button>
        </div>
        {exams.loading ? (
          <p className={styles.state} role="status">
            <span className={styles.stateIcon}>
              <StudentQrIcon name="clock" />
            </span>
            Cargando exámenes…
          </p>
        ) : exams.error ? (
          <div className={styles.error} role="alert">
            <StudentQrIcon name="info" />
            <p>{exams.error.message}</p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={refreshExams}
            >
              Reintentar
            </button>
          </div>
        ) : exams.data.length === 0 ? (
          <p className={styles.state} role="status">
            <span className={styles.stateIcon}>
              <StudentQrIcon name="calendar" />
            </span>
            No tienes exámenes programados actualmente.
          </p>
        ) : (
          <ul className={styles.examList}>
            {exams.data.map((exam) => (
              <li key={exam.exam_id}>
                <StudentExamCard
                  exam={exam}
                  selected={qr.examId === exam.exam_id}
                  onSelect={selectExam}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        ref={qrSectionRef}
        id="student-exam-qr"
        aria-labelledby="student-qr-heading"
        aria-busy={qr.loading}
        aria-live="polite"
        className={`${styles.qrSection} ${qr.examId !== null ? styles.qrSectionActive : ''}`}
      >
        <div className={styles.sectionHeading}>
          <h2 id="student-qr-heading">
            <StudentQrIcon name="qr" />
            Tu QR de ingreso
          </h2>
          {qr.examId !== null && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={qr.clear}
            >
              Cerrar QR
            </button>
          )}
        </div>
        {qr.loading ? (
          <p className={styles.state} role="status">
            <span className={styles.stateIcon}>
              <StudentQrIcon name="clock" />
            </span>
            Cargando QR de {selectedExam?.subject}: {selectedExam?.exam_title}…
          </p>
        ) : qr.error ? (
          <div className={styles.error} role="alert">
            <StudentQrIcon name="info" />
            <p>
              {selectedExam?.subject} · {selectedExam?.exam_title}
            </p>
            <p>{qr.error.message}</p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={
                qr.error.status === 403 || qr.error.status === 404
                  ? refreshExams
                  : qr.retry
              }
            >
              {qr.error.status === 403 || qr.error.status === 404
                ? 'Actualizar exámenes'
                : 'Reintentar'}
            </button>
          </div>
        ) : qr.data ? (
          <StudentQrCard
            key={qr.data.exam_id}
            qr={qr.data}
            onRetry={qr.retry}
          />
        ) : (
          <p className={styles.state}>
            <span className={styles.stateIcon}>
              <StudentQrIcon name="qr" />
            </span>
            Selecciona «Ver QR» en un examen disponible.
          </p>
        )}
      </section>
    </div>
  )
}
