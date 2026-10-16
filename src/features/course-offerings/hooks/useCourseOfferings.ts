import { useEffect, useState } from 'react'
import {
  getCourseOfferings,
  getCourseOfferingError,
} from '../api/courseOfferingsApi'
import type {
  CourseOfferingsQuery,
  CourseOfferingsResponse,
} from '../types/courseOffering.types'

type Result =
  | {
      key: string
      revision: number
      status: 'ready'
      response: CourseOfferingsResponse
    }
  | { key: string; revision: number; status: 'error'; message: string }

export function useCourseOfferings(query: CourseOfferingsQuery) {
  const [result, setResult] = useState<Result | null>(null)
  const [revision, setRevision] = useState(0)
  const { page, search, status, academic_term_id, teacher_id } = query
  const key = JSON.stringify([
    page,
    search,
    status,
    academic_term_id,
    teacher_id,
  ])
  useEffect(() => {
    const controller = new AbortController()
    getCourseOfferings(
      { page, search, status, academic_term_id, teacher_id },
      controller.signal,
    ).then(
      (response) => {
        if (!controller.signal.aborted)
          setResult({ key, revision, status: 'ready', response })
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            revision,
            status: 'error',
            message: getCourseOfferingError(error),
          })
      },
    )
    return () => controller.abort()
  }, [page, search, status, academic_term_id, teacher_id, key, revision])
  return {
    state: result?.key === key && result.revision === revision ? result : null,
    reload: () => setRevision((value) => value + 1),
  }
}
