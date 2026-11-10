import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import styles from './AdminModulePage.module.css'

interface AdminModulePageProps {
  title: string
  description: string
}

export function AdminModulePage({
  title,
  description,
}: AdminModulePageProps) {
  return (
    <PageContainer className={styles.page}>
      <PageHeader
        eyebrow="Administración"
        subtitle={title}
        description={description}
        breadcrumbs={[{ label: 'Inicio', to: '/admin' }, { label: title }]}
      />
      <div className={styles.content}>
        <div
          className={styles.status}
          role="status"
        >
          Módulo preparado para su implementación.
        </div>
      </div>
    </PageContainer>
  )
}