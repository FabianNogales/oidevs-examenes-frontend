import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { CollaborationExamCard } from '@/features/collaborations/components/CollaborationExamCard'
import { useMyCollaborations } from '@/features/collaborations/hooks/useMyCollaborations'
import type {
  CollaborationExam,
  MyCollaboration,
} from '@/features/collaborations/types/collaboration.types'
import { useTeacherUpcomingExams } from '../hooks/useTeacherUpcomingExams'
import pageStyles from './TeacherExamsPage.module.css'
import styles from '@/features/collaborations/pages/Collaborations.module.css'

type AccessProps = {
  exam?: CollaborationExam | MyCollaboration
  loading: boolean
  error: string | null
  retry: () => void
  fromTeacher: boolean
  backPath: string
}

// One shared entry-control surface. HU13/HU14 will be integrated here for both origins.
function EntryControlContent({
  exam,
  loading,
  error,
  retry,
  fromTeacher,
  backPath,
}: AccessProps) {
  const backLabel = fromTeacher ? 'Mis exámenes' : 'Colaborador'
  return (
    <main className={pageStyles.page}>
      <section className={pageStyles.content}>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <Link to={backPath}>{backLabel}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Control de ingreso</span>
        </nav>
        <header className={pageStyles.pageHeader}>
          <h1>Control de ingreso</h1>
          {!fromTeacher ? (
            <p>Apoyo en examen · Autorización temporal para este examen.</p>
          ) : null}
        </header>
        {loading ? (
          <p role="status">Consultando autorización del examen…</p>
        ) : error ? (
          <section className={pageStyles.state} role="alert">
            <p>{error}</p>
            <button type="button" onClick={retry}>
              Reintentar
            </button>
          </section>
        ) : !exam ? (
          <section className={pageStyles.state}>
            <p>
              No tienes una autorización disponible para acceder a este examen.
            </p>
            <Link to={backPath}>Volver a {backLabel}</Link>
          </section>
        ) : (
          <>
            <CollaborationExamCard exam={exam} asSupport={!fromTeacher} />
            <section
              className={styles.section}
              aria-labelledby="entry-tools-title"
            >
              <h2 id="entry-tools-title">Herramientas de control de ingreso</h2>
              <p>
                Las herramientas de verificación y escaneo QR estarán
                disponibles próximamente.
              </p>
              <div className={styles.tools}>
                <button type="button" className={styles.primaryButton} disabled>
                  Verificación
                </button>
                <button type="button" className={styles.primaryButton} disabled>
                  Escanear QR
                </button>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}

function TeacherEntryControl({ examId }: { examId: number }) {
  const { exams, isLoading, errorMessage, loadExams } =
    useTeacherUpcomingExams()
  return (
    <EntryControlContent
      exam={exams.find((exam) => exam.id === examId)}
      loading={isLoading}
      error={errorMessage}
      retry={() => void loadExams()}
      fromTeacher
      backPath="/teacher/exams"
    />
  )
}

function CollaborationEntryControl({ examId }: { examId: number }) {
  const { collaborations, isLoading, error, reload } =
    useMyCollaborations()
  // Recheck an authorization when opening the shared route; history state is not proof of access.
  useEffect(() => {
    reload()
  }, [reload, examId])
  const collaboration = collaborations.find((item) => item.exam_id === examId)
  return (
    <EntryControlContent
      exam={collaboration}
      loading={isLoading}
      error={error}
      retry={reload}
      fromTeacher={false}
      backPath="/collaborator"
    />
  )
}

export function EntryControlPage() {
  const { examId } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const fromTeacher =
    searchParams.get('from') === 'teacher' && user?.roles.includes('DOCENTE')
  return fromTeacher ? (
    <TeacherEntryControl examId={Number(examId)} />
  ) : (
    <CollaborationEntryControl examId={Number(examId)} />
  )
}
