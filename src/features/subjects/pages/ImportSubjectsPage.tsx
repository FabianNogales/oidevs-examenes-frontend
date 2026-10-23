import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { SubjectImportPanel } from '../components/import/SubjectImportPanel'
import styles from '@/shared/styles/CsvImport.module.css'

export function ImportSubjectsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/admin' },
            { label: 'Materias', to: '/admin/subjects' },
            { label: 'Importar materias' },
          ]}
        />
        <header className={styles.pageHeader}>
          <h1>Importar materias</h1>
          <p>Carga el catálogo de materias mediante un archivo CSV.</p>
        </header>
        <SubjectImportPanel />
      </div>
    </section>
  )
}
