import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import {
  addStudentToSubject,
  getSubjectStudents,
  getTeacherSubjects,
  importStudentsCsv,
} from '@/features/students/api/teacherStudentsApi'
import { AddStudentsModal } from '@/features/students/components/AddStudentsModal'
import { StudentsSkeleton } from '@/features/students/components/StudentsSkeleton'
import type { CsvImportSummary, StudentEnrollment } from '@/features/students/types/student.types'
import type { Subject } from '@/features/subjects/types/subject.types'

import styles from './TeacherSubjectStudentsPage.module.css'

export function TeacherSubjectStudentsPage() {
  const navigate = useNavigate()
  const { subjectId } = useParams()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [students, setStudents] = useState<StudentEnrollment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const loadSubjectData = useCallback(async () => {
    if (!subjectId) {
      setErrorMessage('No se seleccionó una materia válida.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const subjects = await getTeacherSubjects()
      const selectedSubject = subjects.find((item) => String(item.id) === String(subjectId)) ?? null

      if (!selectedSubject) {
        setSubject(null)
        throw new Error('La materia seleccionada no está disponible para este docente.')
      }

      setSubject(selectedSubject)
      const nextStudents = await getSubjectStudents(subjectId)
      setStudents(nextStudents)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los estudiantes de la materia.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    const run = async () => {
      await loadSubjectData()
    }

    void run()
  }, [loadSubjectData])

  async function handleManualSubmit(sis: string) {
    if (!subjectId) {
      throw new Error('No se seleccionó una materia válida.')
    }

    const addedStudent = await addStudentToSubject(subjectId, sis)
    setStudents((previous) => [addedStudent, ...previous])
    setToastMessage('Estudiante agregado correctamente.')
    setToastType('success')
    setIsModalOpen(false)
  }

  async function handleCsvSubmit(file: File): Promise<CsvImportSummary> {
    if (!subjectId) {
      throw new Error('No se seleccionó una materia válida.')
    }

    const text = await file.text()
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter((row) => row.length > 0)

    if (rows.length === 0) {
      throw new Error('El archivo CSV está vacío.')
    }

    const summary = await importStudentsCsv(subjectId, rows)
    const mergedStudents = [...students]

    for (const imported of summary.importedStudents) {
      if (!mergedStudents.some((student) => student.sis === imported.sis)) {
        mergedStudents.push(imported)
      }
    }

    setStudents(mergedStudents)
    setToastMessage(
      summary.validCount > 0
        ? `Se registraron ${summary.validCount} estudiantes.`
        : 'La importación no agregó estudiantes.',
    )
    setToastType(summary.validCount > 0 ? 'success' : 'error')
    setIsModalOpen(false)

    return summary
  }

  if (isLoading) {
    return <StudentsSkeleton />
  }

  if (errorMessage || !subject) {
    return (
      <main className={styles.page}>
        <section className={styles.content}>
          <div className={styles.state} role="alert">
            <h1>No se pudo acceder a la materia</h1>
            <p>{errorMessage ?? 'La materia no existe o no está disponible.'}</p>
            <button type="button" onClick={() => navigate('/teacher/students')}>
              Volver a estudiantes
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <div className={styles.headingWrap}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate('/teacher/students')}
            >
              ← Volver
            </button>
            <div>
              <p className={styles.subjectLabel}>Materia</p>
              <h1>{subject.name}</h1>
            </div>
          </div>

          <div className={styles.subjectMeta}>
            <div>
              <span>Código</span>
              <strong>{subject.code}</strong>
            </div>
            <div>
              <span>Gestión académica</span>
              <strong>{subject.academicManagement}</strong>
            </div>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div>
            <h2>Estudiantes inscritos</h2>
          </div>
          <button type="button" className={styles.primaryButton} onClick={() => setIsModalOpen(true)}>
            Agregar estudiantes
          </button>
        </div>

        {students.length === 0 ? (
          <section className={styles.emptyState}>
            <h3>No hay estudiantes inscritos en esta materia.</h3>
            <p>Agrega estudiantes por SIS o CSV para comenzar.</p>
            <button type="button" className={styles.primaryButton} onClick={() => setIsModalOpen(true)}>
              Agregar estudiantes
            </button>
          </section>
        ) : (
          <section className={styles.list} aria-label="Estudiantes inscritos">
            {students.map((student) => (
              <article key={student.id} className={styles.studentRow}>
                <div className={styles.studentInfo}>
                  <span className={styles.label}>SIS</span>
                  <strong>{student.sis}</strong>
                </div>

                <div className={styles.studentInfo}>
                  <span className={styles.label}>Nombre</span>
                  <strong>{student.fullName}</strong>
                </div>

                <div className={styles.studentInfo}>
                  <span className={styles.label}>Estado</span>
                  <span className={styles.status}>{student.status}</span>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>

      <AddStudentsModal
        isOpen={isModalOpen}
        subjectName={subject.name}
        onClose={() => setIsModalOpen(false)}
        onManualSubmit={handleManualSubmit}
        onCsvSubmit={handleCsvSubmit}
      />

      {toastMessage ? (
        <div
          className={`${styles.toast} ${toastType === 'success' ? styles.toastSuccess : styles.toastError}`}
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      ) : null}
    </main>
  )
}
