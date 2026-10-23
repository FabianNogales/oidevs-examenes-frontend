import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { EditExamForm } from '../components/EditExamForm'
import { ExamsSkeleton } from '../components/ExamsSkeleton'
import { useExamDetail } from '../hooks/useExamDetail'
import { safeExamMessage } from '../utils/examMessages'
import styles from './TeacherExamsPage.module.css'
import detailStyles from './TeacherExamDetailPage.module.css'

function TeacherExamEditContent({ examId }: { examId: string | undefined }) {
  const { search } = useLocation()
  const navigate = useNavigate()
  const { notify } = useAuth()
  const { detail, isLoading, errorMessage, reload } = useExamDetail(examId)
  const backTo = `/teacher/exams/${examId}${search}`
  const editable = detail?.can_edit === true

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/' },
            { label: 'Mis exámenes', to: `/teacher/exams${search}` },
            { label: 'Detalle del examen', to: backTo },
            { label: 'Editar examen' },
          ]}
        />
        <header className={`${styles.pageHeader} ${detailStyles.header}`}>
          <h1>Editar examen</h1>
          <p>Actualiza la información de tu evaluación.</p>
        </header>
        {isLoading ? (
          <ExamsSkeleton />
        ) : errorMessage ? (
          <section className={styles.state} role="alert">
            <p>{errorMessage}</p>
            <button type="button" onClick={reload}>
              Reintentar
            </button>
          </section>
        ) : !detail || !editable ? (
          <section className={styles.state} role="status">
            <h2>Edición no disponible</h2>
            <p>
              {safeExamMessage(
                detail?.edit_block_reason,
                'Este examen no está habilitado para edición. Puedes consultar su información en el detalle.',
              )}
            </p>
          </section>
        ) : (
          <div className={detailStyles.sections}>
            <section
              className={detailStyles.rules}
              aria-label="Materia y periodo del examen"
            >
              <h2 className={detailStyles.sectionTitle}>
                {detail.subject_name}
              </h2>
              <p>
                {detail.subject_code} · Periodo académico:{' '}
                {detail.academic_term_name || 'No informado'}
              </p>
            </section>
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
          </div>
        )}
        {!editable ? (
          <Link className={detailStyles.backLink} to={backTo}>
            ← Volver al detalle
          </Link>
        ) : null}
      </section>
    </main>
  )
}

export function TeacherExamEditPage() {
  const { examId } = useParams()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [examId])
  return <TeacherExamEditContent key={examId} examId={examId} />
}
