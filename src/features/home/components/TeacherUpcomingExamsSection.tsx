import { ExamCard } from '@/features/exams/components/ExamCard'
import { ExamsSkeleton } from '@/features/exams/components/ExamsSkeleton'
import { useTeacherUpcomingExams } from '@/features/exams/hooks/useTeacherUpcomingExams'
import styles from './TeacherUpcomingExamsSection.module.css'

export function TeacherUpcomingExamsSection() {
  const { exams, isLoading, errorMessage, loadExams } =
    useTeacherUpcomingExams()

  return (
    <section
      className={styles.section}
      aria-labelledby="upcoming-exams-title"
      aria-busy={isLoading}
    >
      <h2 id="upcoming-exams-title">Próximos exámenes</h2>
      {isLoading ? <ExamsSkeleton /> : null}
      {errorMessage ? (
        <div className={styles.state}>
          <p role="alert">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadExams()}
            disabled={isLoading}
          >
            {isLoading ? 'Reintentando…' : 'Reintentar'}
          </button>
        </div>
      ) : null}
      {!isLoading && !errorMessage && exams.length === 0 ? (
        <p className={styles.state} role="status">
          No tienes próximos exámenes programados.
        </p>
      ) : null}
      {!isLoading && !errorMessage && exams.length > 0 ? (
        <div className={styles.list}>
          {exams.map((exam) => (
            <ExamCard
              key={exam.id}
              subjectCode={exam.subject_code}
              subjectName={exam.subject_name}
              examName={exam.name}
              examDate={exam.exam_date}
              examTime={exam.start_time}
              durationMinutes={exam.duration_minutes}
              roomName={exam.room?.name}
              roomCode={exam.room?.code}
              evaluationType={exam.evaluation_type}
              status={exam.status}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
