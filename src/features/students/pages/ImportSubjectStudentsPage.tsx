import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { getTeacherSubjects } from '../api/teacherStudentsApi'
import type { Subject } from '@/features/subjects/types/subject.types'
import { EnrollmentImportPanel } from '../components/EnrollmentImportPanel'
import styles from '@/shared/styles/CsvImport.module.css'

export function ImportSubjectStudentsPage() {
  const { courseOfferingId } = useParams()
  return <ImportSubjectStudentsContent key={courseOfferingId} />
}

function ImportSubjectStudentsContent() {
  const { courseOfferingId } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const period = params.get('period')
  const suffix = period ? `?period=${encodeURIComponent(period)}` : ''
  const back = `/teacher/students/${courseOfferingId}${suffix}`
  useEffect(() => {
    let current = true
    getTeacherSubjects()
      .then((subjects) => {
        if (!current) return
        const found = subjects.find(
          (item) => String(item.courseOfferingId) === courseOfferingId,
        )
        if (!found)
          setError(
            'La materia no existe o no está disponible para este docente.',
          )
        else setSubject(found)
      })
      .catch((cause) => {
        if (current)
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar la materia.',
          )
      })
    return () => {
      current = false
    }
  }, [courseOfferingId])
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/' },
            { label: 'Mis materias', to: `/teacher/subjects${suffix}` },
            { label: 'Estudiantes inscritos', to: back },
            { label: 'Importar estudiantes' },
          ]}
        />
        <header className={styles.pageHeader}>
          <h1>Importar estudiantes</h1>
          <p>
            {subject
              ? `${subject.name} · ${subject.academicManagement}`
              : 'Carga los estudiantes de la materia mediante un archivo CSV.'}
          </p>
        </header>
        {error ? (
          <section className={styles.panel} role="alert">
            <p>{error}</p>
            <Link to={`/teacher/subjects${suffix}`}>Ir a mis materias</Link>
          </section>
        ) : !subject ? (
          <p role="status">Cargando materia…</p>
        ) : subject.canManage === false ? (
          <section className={styles.panel}>
            <p role="status">
              Esta oferta es de solo consulta. No se pueden importar
              estudiantes.
            </p>
            <Link to={back}>Ver estudiantes inscritos</Link>
          </section>
        ) : (
          <EnrollmentImportPanel
            key={courseOfferingId}
            offeringId={String(subject.courseOfferingId)}
            onReturn={() => navigate(back)}
          />
        )}
      </div>
    </main>
  )
}
