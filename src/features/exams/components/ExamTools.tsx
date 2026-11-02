import { Link, useLocation } from 'react-router'

export function ExamTools({ examId }: { examId: number }) {
  const { search } = useLocation()
  return (
    <>
      <Link to={`/teacher/exams/${examId}/eligibilities${search}`}>
        Habilitaciones
      </Link>
      <Link to={`/teacher/exams/${examId}/collaborators`}>Colaboradores</Link>
      <Link to={`/exams/${examId}/entry-control?from=teacher`}>
        Control de ingreso
      </Link>
    </>
  )
}
