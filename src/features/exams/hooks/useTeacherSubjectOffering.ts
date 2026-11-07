import { useCallback, useEffect, useState } from 'react'
import { getTeacherSubjects } from '@/features/subjects/api/teacherSubjectsApi'
import type { Subject } from '@/features/subjects/types/subject.types'
import { getTeacherDashboardErrorMessage } from '@/features/home/api/teacherDashboardError'
import { parseExamId } from '../api/examDetailsApi'

export interface UseTeacherSubjectOfferingResult {
  subject: Subject | null
  isLoading: boolean
  errorMessage: string | null
  isInvalidOfferingId: boolean
  reload: () => void
}

// Gestiona la obtención y validación de la oferta académica para programar un examen
export function useTeacherSubjectOffering(
  offeringId: string | undefined,
): UseTeacherSubjectOfferingResult {
  const parsedOfferingId = parseExamId(offeringId)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(parsedOfferingId !== null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<number>(0)

  const reload = useCallback(() => {
    setIsLoading(true)
    setErrorMessage(null)
    setAttempt((current) => current + 1)
  }, [])

  useEffect(() => {
    if (parsedOfferingId === null) return
    let isMounted = true

    void getTeacherSubjects()
      .then((subjects) => {
        if (!isMounted) return
        const matchedSubject = subjects.find(
          (item) => Number(item.courseOfferingId) === parsedOfferingId,
        )
        setSubject(matchedSubject ?? null)
        setErrorMessage(
          matchedSubject
            ? null
            : 'La materia no está disponible entre tus asignaciones.',
        )
        setIsLoading(false)
      })
      .catch((cause: unknown) => {
        if (!isMounted) return
        setErrorMessage(getTeacherDashboardErrorMessage(cause))
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [parsedOfferingId, attempt])

  return {
    subject,
    isLoading,
    errorMessage,
    isInvalidOfferingId: parsedOfferingId === null,
    reload,
  }
}