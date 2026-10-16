import { Link, useSearchParams } from 'react-router'
import { useCallback, useState } from 'react'
import { CourseOfferingsPanel } from '../components/CourseOfferingsPanel'
import { OfferingWorkspace } from '../components/OfferingWorkspace'
import { useOfferingNavigationGuard } from '../hooks/useOfferingNavigationGuard'
import styles from './AdminCourseOfferingsPage.module.css'

export function AdminCourseOfferingsPage() {
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const saved = useCallback(() => setRevision((value) => value + 1), [])
  const blocked = useOfferingNavigationGuard(busy)
  const [params] = useSearchParams()
  const rawTeacher = params.get('teacher_id')
  const teacherId =
    rawTeacher &&
    /^[1-9]\d*$/.test(rawTeacher) &&
    Number.isSafeInteger(Number(rawTeacher))
      ? Number(rawTeacher)
      : undefined
  const invalidTeacher = rawTeacher !== null && teacherId === undefined
  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <Link to="/admin/teachers" className={styles.backLink}>
          ← Volver a Gestión de docentes
        </Link>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Administración</p>
            <h1>Asignar materias a docentes</h1>
            <p className={styles.description}>
              Consulta las ofertas académicas y las materias asignadas en cada
              periodo.
            </p>
          </div>
        </header>
        {invalidTeacher ? (
          <p role="alert">
            El identificador del docente no es válido. Vuelve a Gestión de
            docentes.
          </p>
        ) : (
          <>
            {blocked && (
              <p role="status" className={styles.notice}>
                Espera a que termine la operación antes de salir.
              </p>
            )}
            <fieldset className={styles.operationScope} disabled={busy}>
              <legend className={styles.srOnly}>
                Gestionar asignaciones de materias
              </legend>
              <OfferingWorkspace
                key={teacherId ?? 'all'}
                teacherId={teacherId}
                onSaved={saved}
                onBusy={setBusy}
              />
              <h2>Ofertas académicas registradas</h2>
              {teacherId && (
                <p className={styles.scopeHint}>
                  Mostrando las asignaciones del docente seleccionado.{' '}
                  <Link to="/admin/teachers/assignments">
                    Ver todos los docentes
                  </Link>
                </p>
              )}
              <CourseOfferingsPanel
                key={`${teacherId ?? 'all'}-${revision}`}
                teacherId={teacherId}
                editable
                onBusy={setBusy}
              />
            </fieldset>
          </>
        )}
      </div>
    </section>
  )
}
