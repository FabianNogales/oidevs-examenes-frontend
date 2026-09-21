import { Link } from 'react-router'
import { StudentImportPanel } from '@/features/students/components/StudentImportPanel'
import styles from './ImportStudentsPage.module.css'

export function ImportStudentsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <nav className={styles.breadcrumb} aria-label="Ruta de navegacion">
          <Link to="/admin">Inicio</Link>
          <span aria-hidden="true">/</span>
          <span>Importar estudiantes</span>
        </nav>

        <header className={styles.pageHeader}>
          <h1>Importar estudiantes</h1>
          <p>Carga el padron de estudiantes mediante un archivo CSV.</p>
        </header>

        <StudentImportPanel />
      </section>
    </main>
  )
}
