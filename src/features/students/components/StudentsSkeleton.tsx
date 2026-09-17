import styles from './StudentsSkeleton.module.css'

export function StudentsSkeleton() {
  return (
    <main className={styles.page} aria-label="Cargando estudiantes" aria-busy="true">
      <section className={styles.content}>
        <header className={styles.pageHeader} aria-hidden="true">
          <div className={styles.headingWrap}>
            <div className={styles.backButton} />
            <div className={styles.headerText}>
              <div className={styles.subjectLabel} />
              <div className={styles.subjectName} />
            </div>
          </div>

          <div className={styles.subjectMeta}>
            <div>
              <span className={styles.metaLabel} />
              <span className={styles.metaValue} />
            </div>
            <div>
              <span className={styles.metaLabel} />
              <span className={styles.metaValue} />
            </div>
          </div>
        </header>

        <div className={styles.toolbar} aria-hidden="true">
          <div className={styles.titleLine} />
          <div className={styles.primaryButton} />
        </div>

        <div className={styles.studentsHeader} aria-hidden="true">
          <span className={styles.headerCell} />
          <span className={styles.headerCellWide} />
          <span className={styles.headerCell} />
        </div>

        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={styles.studentRow} aria-hidden="true">
            <div className={styles.studentCell} />
            <div className={styles.studentCellWide} />
            <div className={styles.statusCell} />
          </div>
        ))}
      </section>
    </main>
  )
}
