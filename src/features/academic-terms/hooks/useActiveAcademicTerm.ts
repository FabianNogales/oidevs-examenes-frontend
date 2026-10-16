import { useEffect, useState } from 'react'
import {
  getActiveAcademicTerm,
  getAcademicTermError,
} from '../api/academicTermsApi'
import type { AcademicTerm } from '../types/academicTerm.types'

type ActiveState =
  | { revision: number; status: 'ready'; term: AcademicTerm | null }
  | { revision: number; status: 'error'; message: string }

export function useActiveAcademicTerm() {
  const [state, setState] = useState<ActiveState | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getActiveAcademicTerm(controller.signal).then(
      (term) => {
        if (!controller.signal.aborted)
          setState({ revision, status: 'ready', term })
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            revision,
            status: 'error',
            message: getAcademicTermError(error).message,
          })
      },
    )
    return () => controller.abort()
  }, [revision])
  return {
    state: state?.revision === revision ? state : null,
    reload: () => setRevision((value) => value + 1),
  }
}
