import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { RoomImportPanel } from '../components/import/RoomImportPanel'

export function ImportRoomsPage() {
  return (
    <PageContainer labelledBy="import-rooms-title">
      <PageHeader
        title="Importar aulas"
        titleId="import-rooms-title"
        description="Carga el catálogo de aulas mediante un archivo CSV."
        breadcrumbs={[
          { label: 'Inicio', to: '/admin' },
          { label: 'Aulas', to: '/admin/rooms' },
          { label: 'Importar aulas' },
        ]}
      />
      <RoomImportPanel />
    </PageContainer>
  )
}
