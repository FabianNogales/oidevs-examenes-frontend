import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getTeacherSubjects } from '@/features/subjects/api/teacherSubjectsApi'
import type { Subject } from '@/features/subjects/types/subject.types'
import { getTeacherDashboardErrorMessage } from '@/shared/api/teacherDashboardError'
import { CreateExamForm } from '../components/CreateExamForm'
import { ExamsSkeleton } from '../components/ExamsSkeleton'
import { createExam } from '../api/teacherExamsApi'
import { parseExamId } from '../api/examDetailsApi'
import styles from './TeacherExamsPage.module.css'

function CreateContent({ offeringId }: { offeringId: string | undefined }) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { notify } = useAuth()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const backTo = `/teacher/subjects${search}`
  const id = parseExamId(offeringId)

  useEffect(() => {
    let active = true
    if (id === null) return
    void getTeacherSubjects()
      .then((subjects) => {
        if (!active) return
        const selected = subjects.find(
          (item) => Number(item.courseOfferingId) === id,
        )
        setSubject(selected ?? null)
        setError(
          !selected
            ? 'La materia no está disponible entre tus asignaciones.'
            : null,
        )
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(getTeacherDashboardErrorMessage(cause))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, attempt])

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/' },
            { label: 'Mis materias', to: backTo },
            { label: 'Crear examen' },
          ]}
        />
        <header className={styles.pageHeader}>
          <h1>Crear examen</h1>
          <p>
            Programa una evaluación para tu materia. Los campos con * son
            obligatorios.
          </p>
        </header>
        {id === null ? (
          <section className={styles.state} role="alert">
            <h2>Materia no válida</h2>
            <p>Selecciona una materia desde Mis materias.</p>
          </section>
        ) : loading ? (
          <ExamsSkeleton />
        ) : error ? (
          <section className={styles.state} role="alert">
            <h2>No se pudo consultar la materia</h2>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                setAttempt((value) => value + 1)
              }}
            >
              Reintentar
            </button>
          </section>
        ) : subject?.canManage === false ? (
          <section className={styles.state} role="status">
            <h2>Creación no disponible</h2>
            <p>Esta asignación solo está habilitada para consulta.</p>
          </section>
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
      </section>
    </main>
  )
}

export function TeacherExamCreatePage() {
  const { courseOfferingId } = useParams()
  return <CreateContent key={courseOfferingId} offeringId={courseOfferingId} />
}
