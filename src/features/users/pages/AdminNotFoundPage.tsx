import { Link } from 'react-router'

import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'

export function AdminNotFoundPage() {
  return (
    <PageContainer labelledBy="admin-not-found-title">
      <PageHeader
        title="Página no encontrada"
        titleId="admin-not-found-title"
        eyebrow="Administración"
        description="La sección administrativa que buscas no existe o no se encuentra disponible."
        breadcrumbs={[
          { label: 'Inicio', to: '/admin' },
          { label: 'Página no encontrada' },
        ]}
        actions={<Link to="/admin">Volver al inicio</Link>}
      />
    </PageContainer>
  )
}
