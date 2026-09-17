import { useCallback, useEffect, useState } from 'react'

import { getTeacherSubjects } from '@/features/subjects/api/teacherSubjectsApi'
import { SubjectList } from '@/features/subjects/components/SubjectList'
import { SubjectsSkeleton } from '@/features/subjects/components/SubjectsSkeleton'
import type { Subject } from '@/features/subjects/types/subject.types'

import styles from './TeacherSubjectsPage.module.css'

interface TeacherSubjectsPageProps {
  subjects?: Subject[]
  isLoading?: boolean
  errorMessage?: string | null
  onRetry?: () => void
}

export function TeacherSubjectsPage({
  subjects: providedSubjects,
  isLoading: providedIsLoading,
  errorMessage: providedErrorMessage,
  onRetry,
}: TeacherSubjectsPageProps) {
  const [loadedSubjects, setLoadedSubjects] = useState<Subject[]>([])
  const [loadedIsLoading, setLoadedIsLoading] = useState(true)
  const [loadedErrorMessage, setLoadedErrorMessage] = useState<string | null>(null)
  const hasProvidedSubjects = providedSubjects !== undefined
  const subjects = providedSubjects ?? loadedSubjects
  const isLoading = hasProvidedSubjects ? providedIsLoading ?? false : loadedIsLoading
  const errorMessage = hasProvidedSubjects
    ? providedErrorMessage ?? null
    : loadedErrorMessage
  const hasSubjects = subjects.length > 0

  const loadSubjects = useCallback(async () => {
    setLoadedIsLoading(true)
    setLoadedErrorMessage(null)

    try {
      setLoadedSubjects(await getTeacherSubjects())
    } catch (error) {
      setLoadedErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las materias.',
      )
    } finally {
      setLoadedIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasProvidedSubjects) {
      const run = async () => {
        await loadSubjects()
      }

      void run()
    }
  }, [hasProvidedSubjects, loadSubjects])

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Mis materias</h1>
            <p>Gestiona tus materias, crea examenes y administra estudiantes.</p>
          </div>
        </header>

        {isLoading ? <SubjectsSkeleton /> : null}

        {!isLoading && errorMessage ? (
          <section className={styles.state} role="alert">
            <h2>No se pudieron cargar las materias</h2>
            <p>{errorMessage}</p>
            {onRetry || !hasProvidedSubjects ? (
              <button
                type="button"
                onClick={onRetry ?? (() => void loadSubjects())}
              >
                Reintentar
              </button>
            ) : null}
          </section>
        ) : null}

        {!isLoading && !errorMessage && hasSubjects ? (
          <SubjectList subjects={subjects} />
        ) : null}

        {!isLoading && !errorMessage && !hasSubjects ? (
          <section className={styles.state}>
            <h2>No tienes materias asignadas actualmente.</h2>
            <p>Cuando se asignen materias, apareceran en esta seccion.</p>
          </section>
        ) : null}
      </section>
    </main>
  )
}
