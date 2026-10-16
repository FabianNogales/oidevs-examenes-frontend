import { useEffect, useState } from 'react'
import { getAcademicTerms, getAcademicTermError } from '../api/academicTermsApi'
import type {
  AcademicTermsQuery,
  AcademicTermsResponse,
} from '../types/academicTerm.types'

type CatalogState =
  | { key: string; status: 'ready'; result: AcademicTermsResponse }
  | { key: string; status: 'error'; message: string }

export function useAcademicTerms({ page, search, status }: AcademicTermsQuery) {
  const [state, setState] = useState<CatalogState | null>(null)
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([page, search, status, revision])
  useEffect(() => {
    const controller = new AbortController()
    getAcademicTerms({ page, search, status }, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted)
          setState({ key, status: 'ready', result })
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            status: 'error',
            message: getAcademicTermError(error).message,
          })
      },
    )
    return () => controller.abort()
  }, [page, search, status, key])

  return {
    state: state?.key === key ? state : null,
    reload: () => setRevision((value) => value + 1),
  }
}
