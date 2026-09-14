import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { getTeacherSubjects } from '@/features/students/api/teacherStudentsApi'
import { SubjectsSkeleton } from '@/features/subjects/components/SubjectsSkeleton'
import { SubjectList } from '@/features/subjects/components/SubjectList'
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
            <p>Selecciona una materia para gestionar los estudiantes inscritos.</p>
          </div>
        </header>

        {isLoading ? <SubjectsSkeleton /> : null}

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
          <SubjectList
            subjects={subjects}
            showCreateExam={false}
            onAddStudents={(subject) => {
              navigate(`/teacher/students/${subject.courseOfferingId}`)
            }}
          />
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
