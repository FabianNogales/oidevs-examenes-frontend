import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { SubjectImportPanel } from '../components/import/SubjectImportPanel'

export function ImportSubjectsPage() {
  return (
    <PageContainer labelledBy="import-subjects-title">
      <PageHeader
        title="Importar materias"
        titleId="import-subjects-title"
        description="Carga el catálogo de materias mediante un archivo CSV."
        breadcrumbs={[
          { label: 'Inicio', to: '/admin' },
          { label: 'Materias', to: '/admin/subjects' },
          { label: 'Importar materias' },
        ]}
      />
      <SubjectImportPanel />
    </PageContainer>
  )
}
