import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTeacherUpcomingExams } from '@/features/exams/hooks/useTeacherUpcomingExams'
import {
  assignExamCollaborator,
  revokeExamCollaborator,
} from '../api/collaborationsApi'
import { AssignCollaboratorModal } from '../components/AssignCollaboratorModal'
import { CollaborationExamCard } from '../components/CollaborationExamCard'
import { CollaboratorDetailModal } from '../components/CollaboratorDetailModal'
import { CollaboratorsTable } from '../components/CollaboratorsTable'
import { RevokeCollaboratorModal } from '../components/RevokeCollaboratorModal'
import { useExamCollaborators } from '../hooks/useExamCollaborators'
import { useMyCollaborations } from '../hooks/useMyCollaborations'
import type { ExamCollaborator } from '../types/collaboration.types'
import { normalizeCollaborationSearch } from '../utils/collaborationFormat'
import pageStyles from '@/features/exams/pages/TeacherExamsPage.module.css'
import styles from './Collaborations.module.css'

type ModalState =
  | { type: 'assign' }
  | { type: 'view' | 'revoke'; collaborator: ExamCollaborator }
  | null

export function ExamCollaboratorsPage() {
  const { examId } = useParams()
  const { exams, isLoading, errorMessage, loadExams } =
    useTeacherUpcomingExams()
  const exam = exams.find((item) => item.id === Number(examId))
  const list = useExamCollaborators(exam?.id ?? null)
  const { notify } = useAuth()
  const { reload: reloadMyCollaborations } = useMyCollaborations()
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const searchId = useId()
  const search = normalizeCollaborationSearch(query)
  const filtered = list.collaborators.filter((item) =>
    normalizeCollaborationSearch(
      `${item.display_name} ${item.identity_number} ${item.email}`,
    ).includes(search),
  )

  async function assign(userId: number) {
    if (!exam) return
    await assignExamCollaborator(exam.id, userId)
    setModal(null)
    notify('success', 'La autorización temporal fue asignada.')
    list.reload()
    reloadMyCollaborations()
  }

  async function revoke(collaborator: ExamCollaborator) {
    if (!exam) return
    await revokeExamCollaborator(exam.id, collaborator.user_id)
    setModal(null)
    notify('success', 'La autorización temporal fue revocada.')
    list.reload()
    reloadMyCollaborations()
  }

  return (
    <main className={pageStyles.page}>
      <section className={pageStyles.content}>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <Link to="/teacher/exams">Mis exámenes</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Colaboradores</span>
        </nav>
        <header className={pageStyles.pageHeader}>
          <h1>Colaboradores temporales</h1>
          <p>
            Gestiona a los usuarios autorizados para colaborar en este examen.
          </p>
        </header>
        {isLoading ? (
          <p role="status">Cargando examen…</p>
        ) : errorMessage ? (
          <section className={pageStyles.state} role="alert">
            <p>{errorMessage}</p>
            <button type="button" onClick={() => void loadExams()}>
              Reintentar
            </button>
          </section>
        ) : !exam ? (
          <section className={pageStyles.state}>
            <p>El examen no está disponible entre tus exámenes programados.</p>
            <Link to="/teacher/exams">Volver a Mis exámenes</Link>
          </section>
        ) : (
          <>
            <CollaborationExamCard exam={exam} />
            <section
              className={styles.section}
              aria-labelledby="assigned-collaborators-title"
            >
              <div className={styles.sectionHeader}>
                <h2 id="assigned-collaborators-title">
                  Colaboradores asignados
                </h2>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setModal({ type: 'assign' })}
                >
                  + Asignar colaborador
                </button>
              </div>
              <div className={styles.search}>
                <label htmlFor={searchId}>Buscar colaboradores</label>
                <input
                  id={searchId}
                  type="search"
                  placeholder="Buscar por nombre, CI o correo..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              {list.error ? (
                <p className={styles.error} role="alert">
                  {list.error}{' '}
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={list.reload}
                  >
                    Reintentar
                  </button>
                </p>
              ) : null}
              <CollaboratorsTable
                collaborators={filtered}
                loading={list.loading}
                emptyMessage={
                  list.error
                    ? 'No se pudieron consultar los colaboradores.'
                    : search
                      ? 'No se encontraron colaboradores.'
                      : 'Aún no hay colaboradores asignados a este examen.'
                }
                onView={(collaborator) =>
                  setModal({ type: 'view', collaborator })
                }
                onRevoke={(collaborator) =>
                  setModal({ type: 'revoke', collaborator })
                }
              />
            </section>
            {modal?.type === 'assign' ? (
              <AssignCollaboratorModal
                key={exam.id}
                examId={exam.id}
                assignedUserIds={list.collaborators.map(
                  (item) => item.user_id,
                )}
                onClose={() => setModal(null)}
                onAssign={assign}
              />
            ) : null}
            {modal?.type === 'view' ? (
              <CollaboratorDetailModal
                collaborator={modal.collaborator}
                examName={exam.name}
                onClose={() => setModal(null)}
              />
            ) : null}
            {modal?.type === 'revoke' ? (
              <RevokeCollaboratorModal
                collaborator={modal.collaborator}
                onClose={() => setModal(null)}
                onRevoke={() => revoke(modal.collaborator)}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}
