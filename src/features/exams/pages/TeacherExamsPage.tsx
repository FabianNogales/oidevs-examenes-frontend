import { useCallback, useEffect, useState } from 'react'

import { getTeacherUpcomingExams } from '@/features/exams/api/teacherExamsApi'
import { ExamCard } from '@/features/exams/components/ExamCard'
import { ExamsSkeleton } from '@/features/exams/components/ExamsSkeleton'
import type { TeacherUpcomingExamDto } from '@/features/exams/types/exam.types'

import styles from './TeacherExamsPage.module.css'

export function TeacherExamsPage() {
  const [exams, setExams] = useState<TeacherUpcomingExamDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadExams = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextExams = await getTeacherUpcomingExams()
      setExams(nextExams)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar los exámenes.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadExams()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadExams])

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Mis exámenes</h1>
            <p>Consulta tus próximos exámenes programados.</p>
          </div>
        </header>

        {isLoading ? <ExamsSkeleton /> : null}

        {!isLoading && errorMessage ? (
          <section className={styles.state} role="alert">
            <h2>No se pudieron cargar los exámenes</h2>
            <p>{errorMessage}</p>
            <button type="button" onClick={() => void loadExams()}>
              Reintentar
            </button>
          </section>
        ) : null}

        {!isLoading && !errorMessage && exams.length > 0 ? (
          <section aria-label="Exámenes del docente" className={styles.list}>
            {exams.map((exam) => (
              <ExamCard
                key={exam.id}
                subjectCode={exam.subject_code}
                subjectName={exam.subject_name}
                examName={exam.name}
                examDate={exam.exam_date}
                examTime={exam.start_time}
                durationMinutes={exam.duration_minutes}
                roomName={exam.room.name}
                roomCode={exam.room.code}
                evaluationType={exam.evaluation_type}
                status={exam.status}
              />
            ))}
          </section>
        ) : null}

        {!isLoading && !errorMessage && exams.length === 0 ? (
          <section className={styles.state}>
            <h2>Aún no tienes exámenes programados.</h2>
            <p>Cuando programes un examen, aparecerá aquí.</p>
          </section>
        ) : null}
      </section>
    </main>
  )
}
