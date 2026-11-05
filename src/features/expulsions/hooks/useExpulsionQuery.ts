import { useCallback } from 'react'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import {
  getExpulsions,
  getExpulsion,
  getExpulsionHistory,
  getRelatedInfractions,
} from '../api/expulsionsApi'
export function useExpulsions(exam: number, page = 1) {
  return useInfractionResource(
    `expulsions:${exam}:${page}`,
    useCallback(
      (signal: AbortSignal) => getExpulsions(exam, page, signal),
      [exam, page],
    ),
  )
}
export function useExpulsion(exam: number, id: number) {
  return useInfractionResource(
    `expulsion:${exam}:${id}`,
    useCallback(
      (signal: AbortSignal) => getExpulsion(exam, id, signal),
      [exam, id],
    ),
  )
}
export function useExpulsionHistory(
  exam: number,
  student: number,
  page: number,
) {
  return useInfractionResource(
    `expulsion-history:${exam}:${student}:${page}`,
    useCallback(
      (signal: AbortSignal) => getExpulsionHistory(exam, student, page, signal),
      [exam, student, page],
    ),
  )
}
export function useRelatedInfractions(
  exam: number,
  student: number,
  page: number,
) {
  return useInfractionResource(
    `related:${exam}:${student}:${page}`,
    useCallback(
      (signal: AbortSignal) =>
        getRelatedInfractions(exam, student, page, signal),
      [exam, student, page],
    ),
  )
}
