import styles from './SubjectsSkeleton.module.css'

export function SubjectsSkeleton() {
  return (
    <section aria-label="Cargando materias" className={styles.list} aria-busy="true">
      <header className={styles.header} aria-hidden="true">
        <div className={styles.titleLine} />
        <div className={styles.subtitleLine} />
      </header>

      {Array.from({ length: 3 }, (_, index) => (
        <article className={styles.row} key={index} aria-hidden="true">
          <div className={styles.codeLine} />
          <div className={styles.nameLine} />
          <div className={styles.metaLine} />
          <div className={styles.actionWrap}>
            <div className={styles.actionButton} />
          </div>
        </article>
      ))}
    </section>
  )
}
