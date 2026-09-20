import styles from '@/features/students/pages/ImportStudentsPage.module.css'
import type { StudentImportColumn } from '@/features/students/types/studentImport'

const STUDENT_IMPORT_COLUMN_LABELS: ReadonlyArray<{
  csvHeader: StudentImportColumn
  label: string
}> = [
  { csvHeader: 'sis_code', label: 'SIS' },
  { csvHeader: 'identity_number', label: 'CI' },
  { csvHeader: 'first_names', label: 'Nombres' },
  { csvHeader: 'last_names', label: 'Apellidos' },
  { csvHeader: 'email', label: 'Correo' },
  { csvHeader: 'career', label: 'Carrera' },
  { csvHeader: 'profile_photo', label: 'Foto de perfil' },
]

export function ImportColumnsGuide() {
  return (
    <div className={styles.columnsGuide}>
      {STUDENT_IMPORT_COLUMN_LABELS.map((column) => (
        <span key={column.csvHeader}>{column.label}</span>
      ))}
    </div>
  )
}
