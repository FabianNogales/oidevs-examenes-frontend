import { Navigate, useParams } from 'react-router'
export function CreateInfractionPage() {
  const { examId } = useParams()
  return (
    <Navigate replace to={`/exams/${examId}/incidents/create?from=teacher&kind=infractions`} />
  )
}
