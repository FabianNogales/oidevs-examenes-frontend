import { StudentExamCard } from '@/features/students/components/StudentExamCard'
import { StudentQrCard } from '@/features/students/components/StudentQrCard'
import { useStudentExams } from '@/features/students/hooks/useStudentExams'
import { useStudentQr } from '@/features/students/hooks/useStudentQr'
import styles from './StudentQrPage.module.css'

export function StudentQrPage() {
  const exams = useStudentExams()
  const qr = useStudentQr()
  const selectedExam = exams.data.find((exam) => exam.exam_id === qr.examId)

  function refreshExams() {
    qr.clear()
    exams.retry()
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Mis exámenes y códigos QR</h1>
        <p>
          Consulta los exámenes de tus materias registradas y descarga tu QR de
          ingreso.
        </p>
      </header>

      <div className={styles.notice}>
        El QR se habilita 24 horas antes de la fecha y hora programadas. Cada
        examen tiene su propio QR.
      </div>

      <section
        aria-labelledby="student-exams-heading"
        aria-busy={exams.loading}
      >
        <div className={styles.sectionHeading}>
          <h2 id="student-exams-heading">Exámenes programados</h2>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={refreshExams}
            disabled={exams.loading}
          >
            Actualizar exámenes
          </button>
        </div>
        {exams.loading ? (
          <p className={styles.state} role="status">
            Cargando exámenes…
          </p>
        ) : exams.error ? (
          <div className={styles.error} role="alert">
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
            No tienes exámenes programados en tus materias registradas.
          </p>
        ) : (
          <ul className={styles.examGrid}>
            {exams.data.map((exam) => (
              <li key={exam.exam_id}>
                <StudentExamCard
                  exam={exam}
                  selected={qr.examId === exam.exam_id}
                  onSelect={(examId) => void qr.load(examId)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        id="student-exam-qr"
        aria-labelledby="student-qr-heading"
        aria-busy={qr.loading}
        aria-live="polite"
        className={styles.qrSection}
      >
        <div className={styles.sectionHeading}>
          <h2 id="student-qr-heading">QR de ingreso</h2>
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
            Cargando QR de {selectedExam?.subject_name}:{' '}
            {selectedExam?.exam_title}…
          </p>
        ) : qr.error ? (
          <div className={styles.error} role="alert">
            <p>
              {selectedExam?.subject_name} · {selectedExam?.exam_title}
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
            Selecciona «Ver QR» en un examen disponible.
          </p>
        )}
      </section>
    </div>
  )
}
