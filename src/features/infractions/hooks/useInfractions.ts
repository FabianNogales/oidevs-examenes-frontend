import { useCallback } from 'react'
import { getInfractions } from '../api/infractionsApi'
import { useInfractionResource } from './useInfractionResource'

export function useInfractions(examId: number, page = 1) {
  const load = useCallback(
    (signal: AbortSignal) => getInfractions(examId, page, signal),
    [examId, page],
  )
  return useInfractionResource(`list:${examId}:${page}`, load)
}
