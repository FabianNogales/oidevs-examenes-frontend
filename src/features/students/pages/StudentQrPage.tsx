import { useMemo } from 'react'
import { StudentExamCard } from '@/features/students/components/StudentExamCard'
import { StudentQrCard } from '@/features/students/components/StudentQrCard'
import { StudentQrIcon } from '@/features/students/components/StudentQrIcon'
import { useStudentExams } from '@/features/students/hooks/useStudentExams'
import { useStudentQr } from '@/features/students/hooks/useStudentQr'
import type { StudentQrStatus } from '@/features/students/types/studentQr'
import styles from './StudentQrPage.module.css'

const statusOrder: Record<StudentQrStatus, number> = {
  AVAILABLE: 0,
  UPCOMING: 1,
  FINISHED: 2,
}

export function StudentQrPage() {
  const exams = useStudentExams()
  const qr = useStudentQr()
  const orderedExams = useMemo(
    () =>
      [...exams.data].sort((first, second) => {
        const groupOrder =
          statusOrder[first.qr_status] - statusOrder[second.qr_status]
        if (groupOrder !== 0) return groupOrder

        // The contract uses fixed-width YYYY-MM-DD HH:mm:ss local timestamps.
        const dateOrder =
          first.scheduled_at < second.scheduled_at
            ? -1
            : first.scheduled_at > second.scheduled_at
              ? 1
              : 0
        return first.qr_status === 'FINISHED' ? -dateOrder : dateOrder
      }),
    [exams.data],
  )

  function selectExam(examId: number) {
    const exam = exams.data.find((item) => item.exam_id === examId)

    if (exam?.qr_status !== 'AVAILABLE' || qr.examId === examId) return

    qr.select(exam)
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
            {orderedExams.map((exam) => (
              <li key={exam.exam_id}>
                <StudentExamCard
                  exam={exam}
                  selected={qr.examId === exam.exam_id}
                  onSelect={selectExam}
                >
                  {qr.examId === exam.exam_id && (
                    <section
                      id={`exam-${exam.exam_id}-qr`}
                      className={styles.expandedQr}
                      aria-labelledby={`exam-${exam.exam_id}-qr-heading`}
                      aria-busy={qr.loading}
                    >
                      <div className={styles.expandedQrHeading}>
                        <h3 id={`exam-${exam.exam_id}-qr-heading`}>
                          <StudentQrIcon name="qr" />
                          Código QR del examen
                        </h3>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={qr.clear}
                        >
                          Cerrar QR
                        </button>
                      </div>
                      {qr.loading ? (
                        <p className={styles.state} role="status">
                          <span className={styles.stateIcon}>
                            <StudentQrIcon name="clock" />
                          </span>
                          Cargando QR de {exam.subject}: {exam.exam_title}…
                        </p>
                      ) : qr.error ? (
                        <div className={styles.error} role="alert">
                          <StudentQrIcon name="info" />
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
                      ) : null}
                    </section>
                  )}
                </StudentExamCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
