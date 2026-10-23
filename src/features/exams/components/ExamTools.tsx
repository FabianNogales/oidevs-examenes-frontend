import { Link } from 'react-router'

export function ExamTools({ examId }: { examId: number }) {
  return (
    <>
      <Link to={`/teacher/exams/${examId}/eligibilities`}>Habilitaciones</Link>
      <Link to={`/teacher/exams/${examId}/collaborators`}>Colaboradores</Link>
      <Link to={`/exams/${examId}/entry-control?from=teacher`}>
        Control de ingreso
      </Link>
    </>
  )
}
