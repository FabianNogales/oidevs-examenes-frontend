import { Link } from 'react-router'
import { RoomImportPanel } from '../components/import/RoomImportPanel'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

export function ImportRoomsPage() {
  return (
    <section className={styles.pageContainer}>
      <div className={styles.mainContent}>
        <nav className={styles.breadcrumbs} aria-label="Ruta de navegación">
          <Link to="/admin">Inicio</Link>
          <span aria-hidden="true">/</span>
          <Link to="/admin/rooms">Aulas</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Importar aulas</span>
        </nav>
        <header className={styles.headerTitles}>
          <h1>Importar aulas</h1>
          <p>Carga el catálogo de aulas mediante un archivo CSV.</p>
        </header>
        <RoomImportPanel />
      </div>
    </section>
  )
}
