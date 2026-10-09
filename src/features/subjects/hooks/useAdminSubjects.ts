import { useEffect, useState } from 'react'
import {
  getAdminSubjects,
  getSubjectCareers,
  getSubjectsErrorMessage,
} from '../api/adminSubjectsApi'
import type {
  SubjectCareer,
  SubjectsQuery,
  SubjectsResponse,
} from '../types/adminSubject.types'

type CatalogState =
  | { status: 'loading'; result: null; error: null }
  | { status: 'ready'; result: SubjectsResponse; error: null }
  | { status: 'error'; result: null; error: string }

export function useAdminSubjects(query: SubjectsQuery) {
  const [state, setState] = useState<CatalogState>({
    status: 'loading',
    result: null,
    error: null,
  })
  const [retry, setRetry] = useState(0)
  const { page, search, status, career_id } = query
  useEffect(() => {
    const controller = new AbortController()
    getAdminSubjects(
      { page, search, status, career_id },
      controller.signal,
    ).then(
      (result) => {
        if (!controller.signal.aborted)
          setState({ status: 'ready', result, error: null })
      },
      (error) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            result: null,
            error: getSubjectsErrorMessage(error),
          })
      },
    )
    return () => controller.abort()
  }, [page, search, status, career_id, retry])
  function markLoading() {
    setState({ status: 'loading', result: null, error: null })
  }
  function reload() {
    markLoading()
    setRetry((value) => value + 1)
  }
  return { ...state, markLoading, reload }
}

export function useSubjectCareers() {
  const [careers, setCareers] = useState<SubjectCareer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getSubjectCareers(controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) {
          setCareers(result)
          setLoaded(true)
        }
      },
      (error) => {
        if (!controller.signal.aborted) {
          setError(getSubjectsErrorMessage(error))
          setLoaded(true)
        }
      },
    )
    return () => controller.abort()
  }, [retry])
  function reload() {
    setError(null)
    setLoaded(false)
    setRetry((value) => value + 1)
  }
  return { careers, error, loaded, reload }
}
