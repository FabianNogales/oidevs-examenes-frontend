import { useEffect, useState } from 'react'
import { getOfferingPeriods, getCourseOfferingError } from '../api/courseOfferingsApi'
import type { OfferingPeriod } from '../types/courseOffering.types'

type PeriodState =
  | { revision: number; status: 'ready'; periods: OfferingPeriod[] }
  | { revision: number; status: 'error'; message: string }

export function useOfferingPeriods() {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<PeriodState | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const periods = await getOfferingPeriods(controller.signal)
        if (controller.signal.aborted) return
        if (new Set(periods.map((period) => period.id)).size !== periods.length)
          throw new Error('Duplicate periods')
        setResult({ revision, status: 'ready', periods })
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            revision,
            status: 'error',
            message: getCourseOfferingError(error),
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
