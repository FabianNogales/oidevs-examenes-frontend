import { useEffect, useState } from 'react'
import {
  getAcademicTerms,
  getAcademicTermError,
} from '@/features/academic-terms/api/academicTermsApi'
import type { AcademicTerm } from '@/features/academic-terms/types/academicTerm.types'

type PeriodState =
  | { revision: number; status: 'ready'; periods: AcademicTerm[] }
  | { revision: number; status: 'error'; message: string }

export function useOfferingPeriods() {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<PeriodState | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const periods: AcademicTerm[] = []
        let lastPage = 1
        for (let page = 1; page <= lastPage; page++) {
          const response = await getAcademicTerms(
            { page, search: '', status: '' },
            controller.signal,
          )
          if (controller.signal.aborted) return
          periods.push(...response.data)
          lastPage = response.meta.last_page
        }
        if (new Set(periods.map((period) => period.id)).size !== periods.length)
          throw new Error('Duplicate periods')
        setResult({ revision, status: 'ready', periods })
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            revision,
            status: 'error',
            message: getAcademicTermError(error).message,
          })
      }
    }
    void load()
    return () => controller.abort()
  }, [revision])
  return {
    state: result?.revision === revision ? result : null,
    reload: () => setRevision((value) => value + 1),
  }
}
