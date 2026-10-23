import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { OfferingImportPanel } from '../components/OfferingImportPanel'
import { useOfferingNavigationGuard } from '../hooks/useOfferingNavigationGuard'
import styles from './AdminCourseOfferingsPage.module.css'

export function ImportCourseOfferingsPage() {
  const [busy, setBusy] = useState(false)
  const blocked = useOfferingNavigationGuard(busy)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const teacher = params.get('teacher_id')
  const suffix =
    teacher &&
    /^[1-9]\d*$/.test(teacher) &&
    Number.isSafeInteger(Number(teacher))
      ? `?teacher_id=${teacher}`
      : ''
  const back = `/admin/teachers/assignments${suffix}`
  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/admin' },
            { label: 'Docentes', to: '/admin/teachers' },
            { label: 'Asignación de materias', to: back },
            { label: 'Importar asignaciones' },
          ]}
        />
        <header className={styles.pageHeader}>
          <div>
            <h1>Importar asignaciones de materias</h1>
            <p className={styles.description}>
              Asigna materias a uno o varios docentes mediante un archivo CSV.
            </p>
          </div>
        </header>
        {blocked && (
          <p role="status" className={styles.notice}>
            Espera a que termine la operación antes de salir.
          </p>
        )}
        <OfferingImportPanel
          onBusy={setBusy}
          onCancel={() => navigate(back)}
          onViewAssignments={() => navigate(back)}
        />
      </div>
    </section>
  )
}
