import { Outlet } from 'react-router'
import { Footer } from '@/shared/components/Footer/Footer'
import styles from './StudentLayout.module.css'

export function StudentLayout() {
  return (
    <div className={styles.layout}>
      <a className={styles.skipLink} href="#student-content">
        Saltar al contenido
      </a>

      <main id="student-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}