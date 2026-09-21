import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { StudentsSkeleton } from '@/features/students/components/StudentsSkeleton'
import { getTeacherSubjects } from '@/features/students/api/teacherStudentsApi'
import type { Subject } from '@/features/subjects/types/subject.types'

import styles from './TeacherStudentsPage.module.css'

export function TeacherStudentsPage() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadSubjects = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextSubjects = await getTeacherSubjects()
      setSubjects(nextSubjects)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las materias.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      await loadSubjects()
    }

    void run()
  }, [loadSubjects])

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Estudiantes</h1>
            <p>Selecciona una materia para consultar la lista de estudiantes inscritos.</p>
          </div>
        </header>

        {isLoading ? <StudentsSkeleton variant="subjects" /> : null}

        {!isLoading && errorMessage ? (
          <section className={styles.state} role="alert">
            <h2>No se pudieron cargar las materias</h2>
            <p>{errorMessage}</p>
            <button type="button" onClick={() => void loadSubjects()}>
              Reintentar
            </button>
          </section>
        ) : null}

        {!isLoading && !errorMessage && subjects.length > 0 ? (
          <section className={styles.subjectGrid} aria-label="Materias del docente">
            {subjects.map((subject) => (
              <article key={subject.courseOfferingId} className={styles.subjectCard}>
                <div className={styles.cardBody}>
                  <div className={styles.subjectMeta}>
                    <h2>{subject.name}</h2>
                    <p>{subject.code ?? 'No disponible'}</p>
                  </div>

                  <div className={styles.cardDetails}>
                    <span className={styles.metaLabel}>Gestión académica</span>
                    <span className={styles.metaValue}>{subject.academicManagement}</span>
                  </div>
                </div>

                <div className={styles.cardAction}>
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/students/${subject.courseOfferingId}`)}
                  >
                    Ver lista
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {!isLoading && !errorMessage && subjects.length === 0 ? (
          <section className={styles.state}>
            <h2>No hay materias disponibles para gestión.</h2>
            <p>Cuando el docente tenga materias asignadas, aparecerán aquí.</p>
          </section>
        ) : null}
      </section>
    </main>
  )
}
