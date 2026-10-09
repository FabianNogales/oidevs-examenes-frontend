import { Link } from 'react-router'
import { SubjectImportPanel } from '../components/import/SubjectImportPanel'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

export function ImportSubjectsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <Link to="/admin">Inicio</Link>
          <span aria-hidden="true">/</span>
          <Link to="/admin/subjects">Materias</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Importar materias</span>
        </nav>
        <header className={styles.pageHeader}>
          <h1>Importar materias</h1>
          <p>Carga el catálogo de materias mediante un archivo CSV.</p>
        </header>
        <SubjectImportPanel />
      </div>
    </section>
  )
}
