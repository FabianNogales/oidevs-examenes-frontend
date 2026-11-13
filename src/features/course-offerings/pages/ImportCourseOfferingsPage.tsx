import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
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
    <PageContainer>
      <PageHeader
        title="Importar asignaciones de materias"
        description="Asigna materias a uno o varios docentes mediante un archivo CSV."
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Docentes', to: '/admin/teachers' },
          { label: 'Asignación de materias', to: back },
          { label: 'Importar asignaciones' },
        ]}
      />
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
    </PageContainer>
  )
}
