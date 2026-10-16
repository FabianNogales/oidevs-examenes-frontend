import { useEffect, useState } from 'react'
import { AcademicTermApiError, getAcademicTerm } from '../api/academicTermsApi'
import type { AcademicTerm } from '../types/academicTerm.types'

type RecordState =
  | { key: string; status: 'ready'; term: AcademicTerm }
  | { key: string; status: 'error'; message: string; unavailable: boolean }

export function useAcademicTermRecord(termId: number | null) {
  const [state, setState] = useState<RecordState | null>(null)
  const [revision, setRevision] = useState(0)
  const key = `${termId}:${revision}`
  useEffect(() => {
    if (termId === null) return
    const controller = new AbortController()
    getAcademicTerm(termId, controller.signal).then(
      (term) => {
        if (!controller.signal.aborted) setState({ key, status: 'ready', term })
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No se pudo consultar el periodo.',
            unavailable:
              error instanceof AcademicTermApiError &&
              [403, 404].includes(error.status ?? 0),
          })
      },
    )
    return () => controller.abort()
  }, [termId, key])
  return {
    state: state?.key === key ? state : null,
    reload: () => setRevision((value) => value + 1),
  }
}
