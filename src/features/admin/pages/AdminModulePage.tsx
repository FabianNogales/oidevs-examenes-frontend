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
    <section className={styles.page}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>Administración</p>

        <h1>{title}</h1>

        <p className={styles.description}>
          {description}
        </p>

        <div
          className={styles.status}
          role="status"
        >
          Módulo preparado para su implementación.
        </div>
      </div>
    </section>
  )
}