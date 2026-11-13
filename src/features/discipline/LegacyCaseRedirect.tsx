import { useCallback } from 'react'
import { Navigate, useParams } from 'react-router'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import { Button } from '@/shared/components/ui/Button/Button'
import { resolveCase } from './disciplineApi'
function Resolve({
  examId,
  source,
  id,
}: {
  examId: number
  source: string
  id: number
}) {
  const query = useInfractionResource(
    `legacy-case:${examId}:${source}:${id}`,
    useCallback(
      (signal) => resolveCase(examId, source, id, signal),
      [examId, source, id],
    ),
  )
  if (query.loading) return <p role="status">Abriendo el caso…</p>
  if (query.error)
    return (
      <div role="alert">
        <p>{query.error}</p>
        <Button onClick={query.retry}>Reintentar</Button>
      </div>
    )
  return query.data ? (
    <Navigate replace to={`/exams/${examId}/cases/${query.data.data.id}`} />
  ) : null
}
export function LegacyCaseRedirect({
  source,
  param,
}: {
  source: string
  param: string
}) {
  const params = useParams(),
    exam = Number(params.examId),
    id = Number(params[param])
  return Number.isSafeInteger(exam) &&
    exam > 0 &&
    Number.isSafeInteger(id) &&
    id > 0 ? (
    <Resolve key={`${exam}:${id}`} examId={exam} id={id} source={source} />
  ) : (
    <p role="alert">El registro solicitado no es válido.</p>
  )
}
