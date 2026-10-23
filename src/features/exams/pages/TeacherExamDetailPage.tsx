import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { Link, useLocation, useParams } from 'react-router'
import { ExamCard } from '@/features/exams/components/ExamCard'
import { ExamTools } from '@/features/exams/components/ExamTools'
import { ExamCancellation } from '@/features/exams/components/ExamCancellation'
import { ExamsSkeleton } from '@/features/exams/components/ExamsSkeleton'
import { useExamDetail } from '@/features/exams/hooks/useExamDetail'
import { safeExamMessage } from '@/features/exams/utils/examMessages'
import styles from './TeacherExamsPage.module.css'
import detailStyles from './TeacherExamDetailPage.module.css'
import management from './ExamManagement.module.css'

function TeacherExamDetailContent({ examId }: { examId: string | undefined }) {
  const { search } = useLocation()
  const { exam, detail, isLoading, errorMessage, reload } =
    useExamDetail(examId)
  const backToList = `/teacher/exams${search}`

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/' },
            { label: 'Mis exámenes', to: backToList },
            { label: 'Detalle del examen' },
          ]}
        />
        <header className={`${styles.pageHeader} ${detailStyles.header}`}>
          <h1>{exam?.name ?? 'Detalle del examen'}</h1>
          <p>Consulta la información y las herramientas de tu evaluación.</p>
        </header>
        {isLoading ? <ExamsSkeleton /> : null}
        {errorMessage ? (
          <section className={styles.state} role="alert">
            <h2>No se pudo consultar el examen</h2>
            <p>{errorMessage}</p>
            <button type="button" onClick={reload}>
              Reintentar
            </button>
          </section>
        ) : null}
        {exam ? (
          <div className={detailStyles.sections}>
            {!detail ? (
              <p className={management.notice} role="status">
                Solo está disponible el resumen del examen. El servidor aún no
                proporciona el detalle completo ni sus normas.
              </p>
            ) : null}
            <section aria-labelledby="exam-information-title">
              <h2
                id="exam-information-title"
                className={detailStyles.sectionTitle}
              >
                Información del examen
              </h2>
              <ExamCard
                subjectCode={exam.subject_code}
                subjectName={exam.subject_name}
                examName={exam.name}
                examDate={exam.exam_date}
                examTime={exam.start_time}
                durationMinutes={exam.duration_minutes}
                roomName={exam.room?.name}
                roomCode={exam.room?.code}
                evaluationType={exam.evaluation_type}
                status={exam.status}
                academicTermName={exam.academic_term_name}
              >
                <ExamTools examId={exam.id} />
              </ExamCard>
            </section>
            {detail ? (
              <section
                className={detailStyles.rules}
                aria-labelledby="exam-rules-title"
              >
                <h2 id="exam-rules-title" className={detailStyles.sectionTitle}>
                  Normas y restricciones
                </h2>
                <p>
                  {detail.rules?.trim()
                    ? detail.rules
                    : 'No se registraron normas adicionales para este examen.'}
                </p>
              </section>
            ) : null}
            {detail?.can_edit === true ? (
              <div className={detailStyles.actions}>
                <Link to={`/teacher/exams/${detail.id}/edit${search}`}>
                  Editar examen
                </Link>
              </div>
            ) : detail?.can_edit === false ? (
              <p>
                {safeExamMessage(
                  detail.edit_block_reason,
                  'La edición no está habilitada para este examen.',
                )}
              </p>
            ) : null}
            {detail ? (
              <ExamCancellation
                key={`${detail.id}:${detail.updated_at}`}
                exam={detail}
                onReload={reload}
              />
            ) : null}
          </div>
        ) : null}
        <Link className={detailStyles.backLink} to={backToList}>
          ← Volver a Mis exámenes
        </Link>
      </section>
    </main>
  )
}

export function TeacherExamDetailPage() {
  const { examId } = useParams()
  return <TeacherExamDetailContent key={examId} examId={examId} />
}
