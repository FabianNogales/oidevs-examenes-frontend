import styles from './StudentsSkeleton.module.css'

type StudentsSkeletonProps = {
  variant?: 'subjects' | 'students'
}

export function StudentsSkeleton({ variant = 'subjects' }: StudentsSkeletonProps) {
  if (variant === 'students') {
    return (
      <main className={styles.studentPage} aria-label="Cargando estudiantes" aria-busy="true">
        <section className={styles.studentContent}>
          <header className={styles.studentHeader} aria-hidden="true">
            <div className={styles.headingGroup}>
              <div className={styles.backButton} />
              <div className={styles.headerText}>
                <div className={styles.subjectLabel} />
                <div className={styles.subjectTitle} />
              </div>
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaCell}>
                <div className={styles.metaLabel} />
                <div className={styles.metaValue} />
              </div>
              <div className={styles.metaCell}>
                <div className={styles.metaLabel} />
                <div className={styles.metaValue} />
              </div>
            </div>
          </header>

          <div className={styles.toolbarRow} aria-hidden="true">
            <div className={styles.toolbarTitle} />
            <div className={styles.primaryButton} />
          </div>

          <div className={styles.tableHeader} aria-hidden="true">
            <span className={styles.tableCell} />
            <span className={styles.tableCellWide} />
            <span className={styles.tableCellSmall} />
          </div>

          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={styles.studentRow} aria-hidden="true">
              <div className={styles.tableCell} />
              <div className={styles.tableCellWide} />
              <div className={styles.statusCell} />
            </div>
          ))}
        </section>
      </main>
    )
  }

  return (
    <section className={styles.grid} aria-label="Cargando materias" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <article key={index} className={styles.card} aria-hidden="true">
          <div className={styles.titleBlock}>
            <div className={styles.titleLine} />
            <div className={styles.subtitleLine} />
          </div>

          <div className={styles.metaBlock}>
            <div className={styles.metaLabel} />
            <div className={styles.metaValue} />
          </div>

          <div className={styles.actionRow}>
            <div className={styles.buttonLine} />
          </div>
        </article>
      ))}
    </section>
  )
}
