import { Navigate, useParams } from 'react-router'
export function CreateExpulsionPage() {
  const { examId } = useParams()
  return (
    <Navigate replace to={`/exams/${examId}/incidents/create?from=teacher`} />
  )
}
