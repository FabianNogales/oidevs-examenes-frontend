import { useEffect } from 'react'
import { Link } from 'react-router'
import { CollaborationExamCard } from '../components/CollaborationExamCard'
import { useMyCollaborations } from '../hooks/useMyCollaborations'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import styles from '@/features/exams/pages/TeacherExamsPage.module.css'

const titleId = 'collaborator-title'

export function CollaboratorPage() {
  const { collaborations, isLoading, error, reload } = useMyCollaborations()

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader
          title="Apartado de colaborador"
          titleId={titleId}
          description="Consulta los exámenes en los que tienes una autorización temporal y accede a las herramientas de control de ingreso."
        />
        <section className={`${styles.content} ${styles.contentFull}`}>
          {isLoading ? (
            <p role="status">Cargando exámenes de apoyo…</p>
          ) : error ? (
            <section className={styles.state} role="alert">
              <p>{error}</p>
              <button type="button" onClick={reload}>
                Reintentar
              </button>
            </section>
          ) : collaborations.length === 0 ? (
            <section className={styles.state}>
              <p>No tienes exámenes disponibles como colaborador.</p>
            </section>
          ) : (
            <section
              className={styles.list}
              aria-label="Exámenes autorizados como apoyo"
            >
              {collaborations.map((collaboration) => (
                <CollaborationExamCard
                  key={collaboration.exam_id}
                  exam={collaboration}
                  asSupport
                >
                  <Link
                    to={`/exams/${collaboration.exam_id}/entry-control?from=collaborator`}
                  >
                    Control de ingreso
                  </Link>
                  <Link to={`/exams/${collaboration.exam_id}/offline`}>Preparar control sin conexión</Link>
                </CollaborationExamCard>
              ))}
            </section>
          )}
        </section>
      </PageContainer>
    </main>
  )
}
