import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { getTeacherSubjects } from '@/features/subjects/api/teacherSubjectsApi'
import { SubjectList } from '@/features/subjects/components/SubjectList'
import { TeacherOfferingFilters } from '@/features/course-offerings/components/TeacherOfferingFilters'
import { SubjectsSkeleton } from '@/features/subjects/components/SubjectsSkeleton'
import type { Subject } from '@/features/subjects/types/subject.types'
import { getTeacherDashboardErrorMessage } from '@/shared/api/teacherDashboardError'

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
  const [loadedErrorMessage, setLoadedErrorMessage] = useState<string | null>(
    null,
  )
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const period = searchParams.get('period') ?? ''
  function setPeriod(value: string) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set('period', value)
      else next.delete('period')
      return next
    })
  }
  const subjectsRequestInFlight = useRef(false)
  const hasProvidedSubjects = providedSubjects !== undefined
  const subjects = providedSubjects ?? loadedSubjects
  const isLoading = hasProvidedSubjects
    ? (providedIsLoading ?? false)
    : loadedIsLoading
  const errorMessage = hasProvidedSubjects
    ? (providedErrorMessage ?? null)
    : loadedErrorMessage
  const hasSubjects = subjects.length > 0
  const visibleSubjects = subjects.filter(
    (subject) => !period || subject.academicManagement === period,
  )

  const loadSubjects = useCallback(async () => {
    if (subjectsRequestInFlight.current) return
    subjectsRequestInFlight.current = true
    setLoadedIsLoading(true)

    try {
      setLoadedSubjects(await getTeacherSubjects())
      setLoadedErrorMessage(null)
    } catch (error) {
      setLoadedErrorMessage(getTeacherDashboardErrorMessage(error))
    } finally {
      subjectsRequestInFlight.current = false
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
        <Breadcrumbs
          items={[{ label: 'Inicio', to: '/' }, { label: 'Mis materias' }]}
        />
        <header className={styles.pageHeader}>
          <div>
            <h1>Mis materias</h1>
            <p>
              Gestiona tus materias, crea examenes y administra estudiantes.
            </p>
          </div>
        </header>

        {isLoading ? <SubjectsSkeleton /> : null}

        {errorMessage ? (
          <section className={styles.state} role="alert">
            <h2>No se pudieron cargar las materias</h2>
            <p>{errorMessage}</p>
            {onRetry || !hasProvidedSubjects ? (
              <button
                type="button"
                onClick={onRetry ?? (() => void loadSubjects())}
                disabled={isLoading}
              >
                {isLoading ? 'Reintentando…' : 'Reintentar'}
              </button>
            ) : null}
          </section>
        ) : null}

        {!isLoading && !errorMessage && hasSubjects && (
          <TeacherOfferingFilters
            subjects={subjects}
            term={period}
            onChange={setPeriod}
          />
        )}
        {!isLoading &&
          !errorMessage &&
          hasSubjects &&
          visibleSubjects.length === 0 && (
            <p role="status">
              No hay materias asignadas en el periodo seleccionado.
            </p>
          )}
        {!isLoading && !errorMessage && hasSubjects ? (
          <SubjectList
            subjects={visibleSubjects}
            onCreateExam={(subject) => {
              if (subject.canManage === false) return
              navigate(
                `/teacher/subjects/${subject.courseOfferingId}/exams/create${period ? `?period=${encodeURIComponent(period)}` : ''}`,
              )
            }}
            onAddStudents={(subject) =>
              navigate(
                `/teacher/students/${subject.courseOfferingId}${period ? `?period=${encodeURIComponent(period)}` : ''}`,
              )
            }
          />
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
