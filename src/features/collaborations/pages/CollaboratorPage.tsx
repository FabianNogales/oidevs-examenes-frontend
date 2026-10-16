import { useEffect } from 'react'
import { Link } from 'react-router'
import { CollaborationExamCard } from '../components/CollaborationExamCard'
import { useMyCollaborations } from '../hooks/useMyCollaborations'
import styles from '@/features/exams/pages/TeacherExamsPage.module.css'

export function CollaboratorPage() {
  const { collaborations, isLoading, error, reload } = useMyCollaborations()

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <h1>Apartado de colaborador</h1>
          <p>
            Consulta los exámenes en los que tienes una autorización temporal y
            accede a las herramientas de control de ingreso.
          </p>
        </header>
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
              </CollaborationExamCard>
            ))}
          </section>
        )}
      </section>
    </main>
  )
}
