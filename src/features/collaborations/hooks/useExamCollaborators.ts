import { useCallback, useEffect, useState } from 'react'
import {
  getCollaborationError,
  getExamCollaborators,
} from '../api/collaborationsApi'
import type { ExamCollaborator } from '../types/collaboration.types'

export function useExamCollaborators(examId: number | null) {
  const [collaborators, setCollaborators] = useState<ExamCollaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((current) => current + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setCollaborators([])
    setError(null)
    if (examId === null) {
      setLoading(false)
      return
    }
    setLoading(true)
    void getExamCollaborators(examId, controller.signal)
      .then((collaborators) => {
        if (!controller.signal.aborted) {
          setCollaborators(collaborators)
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            getCollaborationError(
              cause,
              'No se pudieron cargar los colaboradores.',
            ),
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [examId, version])
  return { collaborators, loading, error, reload }
}
