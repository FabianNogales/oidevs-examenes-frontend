import styles from './StudentsSkeleton.module.css'

export function StudentsSkeleton() {
  return (
    <div className={styles.skeletonList} aria-label="Cargando estudiantes" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={styles.row}>
          <span className={styles.line} />
          <span className={styles.line} />
          <span className={styles.line} />
        </div>
      ))}
    </div>
  )
}
