import { safeExamMessage } from '../utils/examMessages'
import { hasExamEnded } from '../utils/examDisplayStatus'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { Link, useLocation, useParams } from 'react-router'
import { ExamInformation } from '@/features/exams/components/ExamInformation'
import { ExamCancellation } from '@/features/exams/components/ExamCancellation'
import { ExamsSkeleton } from '@/features/exams/components/ExamsSkeleton'
import { useExamDetail } from '@/features/exams/hooks/useExamDetail'
import styles from './TeacherExamsPage.module.css'
import detailStyles from './TeacherExamDetailPage.module.css'
import management from './ExamManagement.module.css'

function TeacherExamDetailContent({ examId }: { examId: string | undefined }) {
  const { search } = useLocation()
  const { exam, detail, isLoading, errorMessage, reload } =
    useExamDetail(examId)
  const backToList = `/teacher/exams${search}`

  return (
    <main className={`${styles.page} ${detailStyles.detailPage}`}>
      <section className={`${styles.content} ${detailStyles.detailContent}`}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/' },
            { label: 'Mis exámenes', to: backToList },
            { label: 'Detalle del examen' },
          ]}
        />
        <header className={`${styles.pageHeader} ${detailStyles.header}`}>
          <h1>{exam?.name ?? 'Detalle del examen'}</h1>
          <p>
            {exam
              ? [exam.subject_name, exam.subject_code]
                  .filter(Boolean)
                  .join(' · ')
              : 'Consulta la información de tu evaluación.'}
          </p>
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
            <ExamInformation exam={exam} />
            <div className={detailStyles.bodyGrid}>
              {detail ? (
                <section
                  className={detailStyles.rules}
                  aria-labelledby="exam-rules-title"
                >
                  <h2
                    id="exam-rules-title"
                    className={detailStyles.sectionTitle}
                  >
                    Normas y restricciones
                  </h2>
                  <p>
                    {detail.rules?.trim()
                      ? detail.rules
                      : 'No se registraron normas adicionales para este examen.'}
                  </p>
                </section>
              ) : null}
              <div className={detailStyles.actionStack}>
                {detail ? (
                  <section
                    className={detailStyles.editSection}
                    aria-labelledby="exam-edit-title"
                  >
                    <div>
                      <h2
                        id="exam-edit-title"
                        className={detailStyles.sectionTitle}
                      >
                        Edición del examen
                      </h2>
                      <p>
                        {detail.can_edit === true
                          ? 'Actualiza los datos de esta evaluación antes de su inicio.'
                          : hasExamEnded(detail)
                            ? 'El horario de este examen ya terminó. Su información se conserva para consulta.'
                            : safeExamMessage(
                                detail.edit_block_reason,
                                'La edición no está habilitada para este examen.',
                              )}
                      </p>
                    </div>
                    <div className={detailStyles.actions}>
                      {detail.can_edit === true ? (
                        <Link to={`/teacher/exams/${detail.id}/edit${search}`}>
                          Editar examen
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          aria-describedby="exam-edit-title"
                        >
                          Editar examen
                        </button>
                      )}
                    </div>
                  </section>
                ) : null}
                {detail ? (
                  <ExamCancellation
                    key={`${detail.id}:${detail.updated_at}`}
                    exam={detail}
                    onReload={reload}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export function TeacherExamDetailPage() {
  const { examId } = useParams()
  return <TeacherExamDetailContent key={examId} examId={examId} />
}
