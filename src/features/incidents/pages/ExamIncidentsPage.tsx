import { useParams } from 'react-router'
import { DisciplineWorkspace } from '@/features/discipline/DisciplineWorkspace'
import { InvalidExamPage } from '@/features/exams/components/InvalidExamPage'
export function ExamIncidentsPage() {
  const { examId } = useParams(),
    id = Number(examId)
  return Number.isSafeInteger(id) && id > 0 ? (
    <DisciplineWorkspace key={id} examId={id} />
  ) : (
    <InvalidExamPage
      title="Incidencias e infracciones"
      message="El identificador del examen no es válido."
    />
  )
}
