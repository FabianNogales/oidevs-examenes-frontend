import { useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { CreateExamForm } from '../components/CreateExamForm'
import {
  ExamPageStateNotice,
  ExamSchedulerPageShell,
} from '../components/ExamScheduler/ExamPageStateSection'
import { useTeacherSubjectOffering } from '../hooks/useTeacherSubjectOffering'
import { createExam } from '../api/teacherExamsApi'

function ExamCreatePageContent({
  offeringId,
}: {
  offeringId: string | undefined
}) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { notify } = useAuth()
  const backTo = `/teacher/subjects${search}`

  const {
    subject,
    isLoading,
    errorMessage,
    isInvalidOfferingId,
    reload,
  } = useTeacherSubjectOffering(offeringId)

  return (
    <ExamSchedulerPageShell
      breadcrumbs={[
        { label: 'Inicio', to: '/' },
        { label: 'Mis materias', to: backTo },
        { label: 'Programar Evaluación' },
      ]}
      title="Programar Evaluación"
      subtitle="Configura los parámetros del examen y vincula un aula y fecha disponibles."
    >
      {isInvalidOfferingId ? (
        <ExamPageStateNotice
          role="alert"
          title="Materia no válida"
          message="Selecciona una materia desde Mis materias."
        />
      ) : isLoading ? (
        <ExamPageStateNotice isLoading message="" />
      ) : errorMessage ? (
        <ExamPageStateNotice
          role="alert"
          title="No se pudo consultar la materia"
          message={errorMessage}
          onRetry={reload}
        />
      ) : subject?.canManage === false ? (
        <ExamPageStateNotice
          role="status"
          title="Creación no disponible"
          message="Esta asignación solo está habilitada para consulta."
        />
      ) : subject ? (
        <CreateExamForm
          subject={subject}
          onCancel={() => void navigate(backTo)}
          onSubmit={async (payload, selected) => {
            const exam = await createExam(selected.courseOfferingId, payload)
            return exam.id
          }}
          onCreated={(examId) => {
            notify('success', 'Examen programado correctamente.')
            void navigate(`/teacher/exams/${examId}`, { replace: true })
          }}
        />
      ) : null}
    </ExamSchedulerPageShell>
  )
}

export function TeacherExamCreatePage() {
  const { courseOfferingId } = useParams()
  return (
    <ExamCreatePageContent
      key={courseOfferingId}
      offeringId={courseOfferingId}
    />
  )
}