import { Link } from 'react-router'

import styles from './AdminModulePage.module.css'

export function AdminNotFoundPage() {
  return (
    <section className={styles.page}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>
          Administración
        </p>

        <h1>Página no encontrada</h1>

        <p className={styles.description}>
          La sección administrativa que buscas no existe
          o no se encuentra disponible.
        </p>

        <Link to="/admin">
          Volver al iniciocode
        </Link>
      </div>
    </section>
  )
}