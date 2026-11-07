import { useState } from 'react'
import { useLocation } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import {
  StudentImportPanel,
  type ImportStep,
} from '@/features/students/components/StudentImportPanel'

const BREADCRUMB_BY_STEP: Record<ImportStep, string> = {
  select: 'Importar estudiantes',
  preview: 'Vista previa',
  success: 'Resultado de importación',
  unknown: 'Resultado no confirmado',
}

const TITLE_BY_STEP: Record<ImportStep, string> = {
  select: 'Importar estudiantes',
  preview: 'Vista previa de la última importación',
  success: 'Resultado de importación',
  unknown: 'Resultado de importación no confirmado',
}

export function ImportStudentsPage() {
  const location = useLocation()
  const [step, setStep] = useState<ImportStep>('select')

  return (
    <PageContainer>
      <PageHeader
        title={TITLE_BY_STEP[step]}
        description="Carga el padrón de estudiantes mediante un archivo CSV."
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Estudiantes', to: '/admin/students/manage' },
          { label: BREADCRUMB_BY_STEP[step] },
        ]}
      />
      <StudentImportPanel key={location.key} onStepChange={setStep} />
    </PageContainer>
  )
}
