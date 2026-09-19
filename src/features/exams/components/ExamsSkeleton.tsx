import styles from './ExamsSkeleton.module.css'

export function ExamsSkeleton() {
  return (
    <section className={styles.list} aria-label="Cargando exámenes" aria-busy="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <article key={`exam-skeleton-${index}`} className={styles.card}>
          <div className={styles.headerRow}>
            <span className={styles.label} />
            <span className={styles.badge} />
          </div>

          <div className={styles.row}>
            <span className={styles.label} />
            <strong className={styles.value} />
          </div>

          <div className={styles.row}>
            <span className={styles.label} />
            <strong className={styles.value} />
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.row}>
              <span className={styles.label} />
              <strong className={styles.value} />
            </div>
            <div className={styles.row}>
              <span className={styles.label} />
              <strong className={styles.value} />
            </div>
            <div className={styles.row}>
              <span className={styles.label} />
              <strong className={styles.value} />
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}
