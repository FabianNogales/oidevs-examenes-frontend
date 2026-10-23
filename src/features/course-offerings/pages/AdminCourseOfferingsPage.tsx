import { Link, useSearchParams } from 'react-router'
import { useCallback, useState } from 'react'
import { CourseOfferingsPanel } from '../components/CourseOfferingsPanel'
import { OfferingCreateDialog } from '../components/OfferingCreateDialog'
import { useOfferingNavigationGuard } from '../hooks/useOfferingNavigationGuard'
import styles from './AdminCourseOfferingsPage.module.css'

export function AdminCourseOfferingsPage() {
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const saved = useCallback((count: number) => {
    setCreating(false)
    setRevision((value) => value + 1)
    setNotice(
      `${count} ${count === 1 ? 'asignación registrada' : 'asignaciones registradas'} correctamente.`,
    )
  }, [])
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
            <h1>Materias asignadas a docentes</h1>
            <p className={styles.description}>
              Consulta y administra las asignaciones de materias por docente y
              periodo académico.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy || invalidTeacher}
              onClick={() => setCreating(true)}
            >
              + Asignar materias manualmente
            </button>
            <Link
              className={styles.primaryButton}
              to={`/admin/teachers/assignments/import${teacherId ? `?teacher_id=${teacherId}` : ''}`}
            >
              + Importar asignaciones (CSV)
            </Link>
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
            {notice && (
              <p role="status" className={styles.notice}>
                {notice}
              </p>
            )}
            <fieldset className={styles.operationScope} disabled={busy}>
              <legend className={styles.srOnly}>
                Gestionar asignaciones de materias
              </legend>
              {creating && (
                <OfferingCreateDialog
                  key={teacherId ?? 'all'}
                  teacherId={teacherId}
                  onSaved={saved}
                  onClose={() => setCreating(false)}
                  onBusy={setBusy}
                />
              )}
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
