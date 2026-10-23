import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { RoomImportPanel } from '../components/import/RoomImportPanel'
import styles from '@/shared/styles/CsvImport.module.css'

export function ImportRoomsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/admin' },
            { label: 'Aulas', to: '/admin/rooms' },
            { label: 'Importar aulas' },
          ]}
        />
        <header className={styles.pageHeader}>
          <h1>Importar aulas</h1>
          <p>Carga el catálogo de aulas mediante un archivo CSV.</p>
        </header>
        <RoomImportPanel />
      </div>
    </section>
  )
}
