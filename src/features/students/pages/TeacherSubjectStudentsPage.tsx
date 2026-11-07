import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  addStudentToSubject,
  getSubjectStudents,
  getTeacherSubjects,
} from '@/features/students/api/teacherStudentsApi'
import { ManualStudentEnrollmentDialog } from '../components/ManualStudentEnrollmentDialog'
import { StudentsSkeleton } from '@/features/students/components/StudentsSkeleton'
import { SubjectStudentsTable } from '../components/SubjectStudentsTable'
import type { StudentEnrollment } from '@/features/students/types/student.types'
import type { Subject } from '@/features/subjects/types/subject.types'

import styles from './TeacherSubjectStudentsPage.module.css'

export function TeacherSubjectStudentsPage() {
  const [searchParams] = useSearchParams()
  const period = searchParams.get('period')
  const subjectsPath = `/teacher/subjects${period ? `?period=${encodeURIComponent(period)}` : ''}`
  const { notify } = useAuth()
  const { courseOfferingId } = useParams()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [students, setStudents] = useState<StudentEnrollment[]>([])
  const [studentsError, setStudentsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadSubjectData = useCallback(async () => {
    if (!courseOfferingId) {
      setErrorMessage('No se seleccionó una materia válida.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setStudentsError(null)

    try {
      const subjects = await getTeacherSubjects()
      const selectedSubject =
        subjects.find(
          (item) => String(item.courseOfferingId) === String(courseOfferingId),
        ) ?? null

      if (!selectedSubject) {
        setSubject(null)
        throw new Error(
          'La materia seleccionada no está disponible para este docente.',
        )
      }

      setSubject(selectedSubject)
      try {
        const nextStudents = await getSubjectStudents(courseOfferingId)
        setStudents(nextStudents)
      } catch (error) {
        setStudents([])
        setStudentsError(
          error instanceof Error
            ? error.message
            : 'El listado de estudiantes no está disponible.',
        )
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los estudiantes de la materia.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [courseOfferingId])

  useEffect(() => {
    const run = async () => {
      await loadSubjectData()
    }

    void run()
  }, [loadSubjectData])

  async function handleManualSubmit(sis: string) {
    if (subject?.canManage === false)
      throw new Error(
        'Esta oferta es de solo consulta. No se pueden agregar estudiantes.',
      )
    if (!courseOfferingId) {
      throw new Error('No se seleccionó una materia válida.')
    }

    const addedStudent = await addStudentToSubject(courseOfferingId, sis)
    if (addedStudent) {
      setStudents((previous) => [addedStudent, ...previous])
    }
    notify('success', 'Estudiante agregado correctamente.')
    setIsModalOpen(false)
  }

  if (isLoading) {
    return <StudentsSkeleton variant="students" />
  }

  if (errorMessage || !subject) {
    return (
      <main className={styles.page}>
        <section className={styles.content}>
          <Breadcrumbs
            items={[
              { label: 'Inicio', to: '/' },
              { label: 'Mis materias', to: subjectsPath },
              { label: 'Estudiantes de la materia' },
            ]}
          />
          <div className={styles.state} role="alert">
            <h1>No se pudo acceder a la materia</h1>
            <p>
              {errorMessage ?? 'La materia no existe o no está disponible.'}
            </p>
            <Link className={styles.backLink} to={subjectsPath}>
              ← Volver a mis materias
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/' },
            { label: 'Mis materias', to: subjectsPath },
            { label: `Estudiantes de ${subject.name}` },
          ]}
        />
        <header className={styles.pageHeader}>
          <div className={styles.headingWrap}>
            <div>
              <p className={styles.subjectLabel}>Materia</p>
              <h1>{subject.name}</h1>
            </div>
          </div>

          <div className={styles.subjectMeta}>
            <div>
              <span>Código</span>
              <strong>{subject.code ?? 'No disponible'}</strong>
            </div>
            <div>
              <span>Gestión académica</span>
              <strong>{subject.academicManagement}</strong>
            </div>
          </div>
        </header>

        {subject.canManage === false && (
          <p role="status">
            Oferta de solo consulta: se conserva el historial de estudiantes,
            pero no se permiten nuevas inscripciones.
          </p>
        )}
        <div className={styles.toolbar}>
          <div>
            <h2>Estudiantes inscritos</h2>
          </div>
          <div className={styles.enrollmentActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={subject.canManage === false}
              onClick={() => setIsModalOpen(true)}
            >
              + Agregar estudiante manualmente
            </button>
            {subject.canManage === false ? (
              <button type="button" className={styles.primaryButton} disabled>
                Importar estudiantes (CSV)
              </button>
            ) : (
              <Link
                className={styles.primaryButton}
                to={`/teacher/students/${courseOfferingId}/import${period ? `?period=${encodeURIComponent(period)}` : ''}`}
              >
                Importar estudiantes (CSV)
              </Link>
            )}
          </div>
        </div>

        {studentsError ? (
          <section className={styles.emptyState} role="status">
            <h3>Listado de estudiantes no disponible</h3>
            <p>{studentsError}</p>
            <p>
              Las operaciones de inscripción manual y CSV siguen disponibles.
            </p>
          </section>
        ) : students.length === 0 ? (
          <section className={styles.emptyState}>
            <h3>No hay estudiantes inscritos en esta materia.</h3>
            <p>Agrega estudiantes por SIS o CSV para comenzar.</p>
          </section>
        ) : (
          <section aria-label="Estudiantes inscritos">
            <SubjectStudentsTable students={students} />
          </section>
        )}
      </section>

      {isModalOpen && (
        <ManualStudentEnrollmentDialog
          subjectName={subject.name}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleManualSubmit}
        />
      )}
    </main>
  )
}
