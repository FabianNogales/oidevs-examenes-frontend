import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { CreateExamModal } from '@/features/exams/components/CreateExamModal'
import { createExam } from '@/features/exams/api/teacherExamsApi'
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
  const { notify } = useAuth()
  const [loadedSubjects, setLoadedSubjects] = useState<Subject[]>([])
  const [loadedIsLoading, setLoadedIsLoading] = useState(true)
  const [loadedErrorMessage, setLoadedErrorMessage] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [isSubmittingExam, setIsSubmittingExam] = useState(false)
  const [lastCreatedExamName, setLastCreatedExamName] = useState<string | null>(null)
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

  const openCreateExamModal = useCallback((subject: Subject) => {
    setSelectedSubject(subject)
  }, [])

  const closeCreateExamModal = useCallback(() => {
    setSelectedSubject(null)
  }, [])

  const submitCreateExam = useCallback(
    async (payload: {
      name: string
      exam_date: string
      start_time: string
      duration_minutes: number
      room_id: number
      evaluation_type: 'partial' | 'final' | 'makeup'
      rules?: string | null
    }) => {
      if (!selectedSubject) {
        return
      }

      setIsSubmittingExam(true)

      try {
        await createExam(selectedSubject.courseOfferingId, {
          ...payload,
          room_id: Number(payload.room_id) || 0,
          evaluation_type: payload.evaluation_type,
        })

        const examLabel = payload.name.trim() || 'Examen'
        setLastCreatedExamName(examLabel)
        notify('success', 'Examen programado correctamente.')
        setSelectedSubject(null)
      } catch (error) {
        notify(
          'error',
          error instanceof Error
            ? error.message
            : 'No se pudo programar el examen.',
        )
      } finally {
        setIsSubmittingExam(false)
      }
    },
    [notify, selectedSubject],
  )

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Mis materias</h1>
            <p>Gestiona tus materias, crea examenes y administra estudiantes.</p>
          </div>
        </header>

        {lastCreatedExamName ? (
          <div className={styles.successBanner} role="status">
            <strong>Último examen programado:</strong> {lastCreatedExamName}
          </div>
        ) : null}

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
          <SubjectList
            subjects={subjects}
            onCreateExam={openCreateExamModal}
          />
        ) : null}

        {!isLoading && !errorMessage && !hasSubjects ? (
          <section className={styles.state}>
            <h2>No tienes materias asignadas actualmente.</h2>
            <p>Cuando se asignen materias, apareceran en esta seccion.</p>
          </section>
        ) : null}
      </section>

      <CreateExamModal
        isOpen={selectedSubject !== null}
        subject={selectedSubject}
        isSubmitting={isSubmittingExam}
        onClose={closeCreateExamModal}
        onSubmit={submitCreateExam}
      />
    </main>
  )
}
