import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { EditExamForm } from '../components/EditExamForm'
import {
  ExamPageStateNotice,
  ExamSchedulerPageShell,
} from '../components/ExamScheduler/ExamPageStateSection'
import { ExamSubjectBanner } from '../components/ExamScheduler/ExamSubjectBanner'
import { useExamDetail } from '../hooks/useExamDetail'
import { safeExamMessage } from '../utils/examMessages'
import detailStyles from './TeacherExamDetailPage.module.css'

function TeacherExamEditContent({ examId }: { examId: string | undefined }) {
  const { search } = useLocation()
  const navigate = useNavigate()
  const { notify } = useAuth()
  const { detail, isLoading, errorMessage, reload } = useExamDetail(examId)
  const backTo = `/teacher/exams/${examId}${search}`
  const isEditable = detail?.can_edit === true

  return (
    <ExamSchedulerPageShell
      breadcrumbs={[
        { label: 'Inicio', to: '/' },
        { label: 'Mis exámenes', to: `/teacher/exams${search}` },
        { label: 'Detalle del examen', to: backTo },
        { label: 'Editar examen' },
      ]}
      title="Editar examen"
      subtitle="Actualiza los parámetros, horario o ambiente de tu evaluación."
    >
      {isLoading ? (
        <ExamPageStateNotice isLoading message="" />
      ) : errorMessage ? (
        <ExamPageStateNotice
          role="alert"
          message={errorMessage}
          onRetry={reload}
        />
      ) : !detail || !isEditable ? (
        <ExamPageStateNotice
          role="status"
          title="Edición no disponible"
          message={safeExamMessage(
            detail?.edit_block_reason,
            'Este examen no está habilitado para edición. Puedes consultar su información en el detalle.',
          )}
        />
      ) : (
        <>
          <ExamSubjectBanner
            subjectName={detail.subject_name}
            subjectCode={detail.subject_code}
            academicTermName={detail.academic_term_name}
          />

          <EditExamForm
            key={`${detail.id}:${detail.updated_at}`}
            exam={detail}
            backTo={backTo}
            onReload={reload}
            onSaved={() => {
              notify(
                'success',
                'Los cambios del examen se guardaron correctamente.',
              )
              void navigate(backTo, { replace: true })
            }}
          />
        </>
      )}

      {!isEditable ? (
        <Link className={detailStyles.backLink} to={backTo}>
          ← Volver al detalle
        </Link>
      ) : null}
    </ExamSchedulerPageShell>
  )
}

export function TeacherExamEditPage() {
  const { examId } = useParams()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [examId])
  return <TeacherExamEditContent key={examId} examId={examId} />
}