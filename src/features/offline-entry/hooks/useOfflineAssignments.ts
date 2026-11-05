import { useCallback, useEffect, useRef, useState } from 'react'
import { getRequestStatus } from '@/features/auth/utils/apiErrors'
import { getExamCollaborators } from '@/features/collaborations/api/collaborationsApi'
import { getEntryControlStudents } from '@/features/exams/api/entryControlApi'
import {
  getOfflineAssignments,
  offlineError,
  prepareOfflineAssignments,
} from '../api/offlineApi'
import type { OfflineDistribution } from '../types/offline.types'

export function useOfflineAssignments(examId: number, enabled: boolean) {
  const [distribution, setDistribution] = useState<OfflineDistribution | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<{
    students: number | null
    collaborators: number | null
  }>({ students: null, collaborators: null })
  const [version, setVersion] = useState(0)
  const active = useRef<AbortController | null>(null)
  const reload = useCallback(() => setVersion((current) => current + 1), [])
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void getOfflineAssignments(examId, controller.signal)
      .then(
        (value) => {
          if (!controller.signal.aborted) setDistribution(value)
        },
        (cause: unknown) => {
          if (!controller.signal.aborted) {
            if (getRequestStatus(cause) === 404) setDistribution(null)
            else setError(offlineError(cause))
          }
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    void Promise.allSettled([
      getExamCollaborators(examId, controller.signal),
      getEntryControlStudents(
        examId,
        { search: '', page: 1, per_page: 1 },
        controller.signal,
      ),
    ]).then(([collaborators, students]) => {
      if (!controller.signal.aborted)
        setCounts({
          collaborators:
            collaborators.status === 'fulfilled'
              ? collaborators.value.length
              : null,
          students:
            students.status === 'fulfilled'
              ? students.value.summary.total_students
              : null,
        })
    })
    return () => controller.abort()
  }, [enabled, examId, version])
  useEffect(() => () => active.current?.abort(), [])
  async function prepare() {
    if (active.current || distribution) return false
    const controller = new AbortController()
    active.current = controller
    setPreparing(true)
    setError(null)
    try {
      const value = await prepareOfflineAssignments(examId, controller.signal)
      if (!controller.signal.aborted) {
        setDistribution(value)
        return true
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(offlineError(cause))
    } finally {
      if (!controller.signal.aborted) setPreparing(false)
      if (active.current === controller) active.current = null
    }
    return false
  }
  return { distribution, loading, preparing, error, counts, reload, prepare }
}
