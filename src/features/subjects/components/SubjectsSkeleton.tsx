import styles from './SubjectsSkeleton.module.css'

export function SubjectsSkeleton() {
  return (
    <section aria-label="Cargando materias" className={styles.list}>
      {Array.from({ length: 4 }, (_, index) => (
        <div className={styles.row} key={index} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </section>
  )
}