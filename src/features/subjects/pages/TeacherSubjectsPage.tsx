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
  subjects = [],
  isLoading = false,
  errorMessage = null,
  onRetry,
}: TeacherSubjectsPageProps) {
  const hasSubjects = subjects.length > 0

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
            {onRetry ? (
              <button type="button" onClick={onRetry}>
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