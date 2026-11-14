import { useId, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { StudentExamCard } from '@/features/students/components/StudentExamCard'
import { StudentQrCard } from '@/features/students/components/StudentQrCard'
import { StudentQrIcon } from '@/features/students/components/StudentQrIcon'
import { useStudentExams } from '@/features/students/hooks/useStudentExams'
import { useStudentQr } from '@/features/students/hooks/useStudentQr'
import type { StudentQrStatus, StudentQrVersion } from '@/features/students/types/studentQr'
import entryControlStyles from '@/features/exams/pages/EntryControlPage.module.css'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import styles from './StudentQrPage.module.css'

const titleId = 'student-exams-title'

const statusOrder: Record<StudentQrStatus, number> = {
  AVAILABLE: 0,
  UPCOMING: 1,
  PENDING_ELIGIBILITY: 2,
  NOT_ELIGIBLE: 3,
  FINISHED: 4,
}

export function StudentQrPage() {
  const { user, isLoggingOut } = useAuth()
  if (!user || isLoggingOut) return null

  return <StudentQrSession key={user.id} studentName={user.display_name} />
}

function StudentQrSession({ studentName }: { studentName: string }) {
  const exams = useStudentExams()
  const qr = useStudentQr(exams.data)
  const [activeGroup, setActiveGroup] = useState<'current' | 'history'>(
    'current',
  )
  const tabsId = useId()
  const orderedExams = useMemo(
    () =>
      [...exams.data].sort((first, second) => {
        const groupOrder =
          statusOrder[first.qr_status] - statusOrder[second.qr_status]
        if (groupOrder !== 0) return groupOrder

        // The contract uses fixed-width YYYY-MM-DD HH:mm:ss local timestamps.
        const dateOrder =
          first.scheduled_at < second.scheduled_at
            ? -1
            : first.scheduled_at > second.scheduled_at
              ? 1
              : 0
        return first.qr_status === 'FINISHED' ? -dateOrder : dateOrder
      }),
    [exams.data],
  )
  const currentExams = orderedExams.filter(
    (exam) => exam.qr_status !== 'FINISHED',
  )
  const historyExams = orderedExams.filter(
    (exam) => exam.qr_status === 'FINISHED',
  )
  const activeExams = activeGroup === 'current' ? currentExams : historyExams
  const activeEmptyMessage =
    activeGroup === 'current'
      ? 'No tienes exámenes vigentes.'
      : 'No tienes exámenes anteriores.'

  function selectGroup(group: 'current' | 'history') {
    setActiveGroup(group)
  }

  function selectExam(examId: number, version: StudentQrVersion) {
    const exam = exams.data.find((item) => item.exam_id === examId)

    if (exam?.qr_status !== 'AVAILABLE' || (qr.examId === examId && qr.version === version)) return

    qr.select(exam, version)
  }

  function refreshExams() {
    qr.clear()
    exams.retry()
  }

  return (
    <PageContainer labelledBy={titleId} className={styles.page}>
      <PageHeader
        title="Mis exámenes"
        titleId={titleId}
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Mis exámenes', to: '/students/qr' },
        ]}
        description="Consulta tus exámenes programados y accede a tu código QR cuando esté disponible."
      />

      <div className={styles.notice}>
        <StudentQrIcon name="info" />
        <p>
          El código QR se habilita 24 horas antes de la fecha y hora programadas
          del examen.
        </p>
      </div>

      <section
        className={styles.examsPanel}
        aria-labelledby="student-exams-heading"
        aria-busy={exams.loading}
      >
        <div className={styles.sectionHeading}>
          <h2 id="student-exams-heading">
            Tus exámenes
          </h2>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={refreshExams}
            disabled={exams.loading}
          >
            <StudentQrIcon name="refresh" />
            Actualizar exámenes
          </button>
        </div>
        {exams.loading ? (
          <p className={styles.state} role="status">
            <span className={styles.stateIcon}>
              <StudentQrIcon name="clock" />
            </span>
            Cargando exámenes…
          </p>
        ) : exams.error ? (
          <div className={styles.error} role="alert">
            <StudentQrIcon name="info" />
            <p>{exams.error.message}</p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={refreshExams}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div
              className={entryControlStyles.tabs}
              role="tablist"
              aria-label="Exámenes vigentes e historial"
              onKeyDown={(event) => {
                if (
                  !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                    event.key,
                  )
                )
                  return
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 'current'
                    : event.key === 'End'
                      ? 'history'
                      : activeGroup === 'current'
                        ? 'history'
                        : 'current'
                selectGroup(next)
                document.getElementById(`${tabsId}-${next}-tab`)?.focus()
              }}
            >
              <button
                type="button"
                role="tab"
                id={`${tabsId}-current-tab`}
                aria-selected={activeGroup === 'current'}
                aria-controls={`${tabsId}-panel`}
                tabIndex={activeGroup === 'current' ? 0 : -1}
                className={entryControlStyles.tab}
                onClick={() => selectGroup('current')}
              >
                Vigentes <span>({currentExams.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                id={`${tabsId}-history-tab`}
                aria-selected={activeGroup === 'history'}
                aria-controls={`${tabsId}-panel`}
                tabIndex={activeGroup === 'history' ? 0 : -1}
                className={entryControlStyles.tab}
                onClick={() => selectGroup('history')}
              >
                Historial <span>({historyExams.length})</span>
              </button>
            </div>
            <section
              id={`${tabsId}-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-${activeGroup}-tab`}
              className={styles.examTabPanel}
            >
              {activeExams.length === 0 ? (
                <p className={styles.groupEmpty} role="status">
                  {activeEmptyMessage}
                </p>
              ) : (
                <ul className={styles.examList}>
                  {activeExams.map((exam) => (
                    <li key={exam.exam_id}>
                      <StudentExamCard
                        exam={exam}
                        selectedVersion={qr.examId === exam.exam_id ? qr.version : null}
                        onSelect={selectExam}
                      >
                        {qr.examId === exam.exam_id && (
                          <section
                            id={`exam-${exam.exam_id}-qr`}
                            className={styles.expandedQr}
                            aria-labelledby={`exam-${exam.exam_id}-qr-heading`}
                            aria-busy={qr.loading}
                          >
                            <div className={styles.expandedQrHeading}>
                              <h3 id={`exam-${exam.exam_id}-qr-heading`}>
                                {qr.version === 3 ? 'QR para EIDA Control' : 'QR para control web'}
                              </h3>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={qr.clear}
                              >
                                Cerrar QR
                              </button>
                            </div>
                            {qr.loading ? (
                              <p className={styles.state} role="status">
                                <span className={styles.stateIcon}>
                                  <StudentQrIcon name="clock" />
                                </span>
                                Cargando QR de {exam.subject}:{' '}
                                {exam.exam_title}…
                              </p>
                            ) : qr.error ? (
                              <div className={styles.error} role="alert">
                                <StudentQrIcon name="info" />
                                <p>{qr.error.message}</p>
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  onClick={
                                    qr.error.status === 403 ||
                                    qr.error.status === 404
                                      ? refreshExams
                                      : qr.retry
                                  }
                                >
                                  {qr.error.status === 403 ||
                                  qr.error.status === 404
                                    ? 'Actualizar exámenes'
                                    : 'Reintentar'}
                                </button>
                              </div>
                            ) : qr.data && qr.version ? (
                              <StudentQrCard
                                key={`${qr.data.exam_id}:${qr.version}`}
                                qr={qr.data}
                                version={qr.version}
                                studentName={studentName}
                                onRetry={qr.retry}
                              />
                            ) : null}
                          </section>
                        )}
                      </StudentExamCard>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </section>
    </PageContainer>
  )
}
