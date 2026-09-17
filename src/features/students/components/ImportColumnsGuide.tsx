import { STUDENT_IMPORT_COLUMNS } from '@/features/students/utils/studentImportColumns'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

export function ImportColumnsGuide() {
  return (
    <div className={styles.columnsGuide}>
      {STUDENT_IMPORT_COLUMNS.map((column) => (
        <span key={column}>{column}</span>
      ))}
    </div>
  )
}
