import type {
  StudentImportColumn,
  StudentImportPreviewRow,
} from '@/features/students/types/studentImport'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

const STUDENT_IMPORT_TABLE_COLUMNS: ReadonlyArray<{
  key: StudentImportColumn
  label: string
}> = [
  { key: 'sis_code', label: 'SIS' },
  { key: 'identity_number', label: 'CI' },
  { key: 'first_names', label: 'Nombres' },
  { key: 'last_names', label: 'Apellidos' },
  { key: 'email', label: 'Correo' },
  { key: 'career', label: 'Carrera' },
  { key: 'profile_photo', label: 'Foto de perfil' },
]

export function StudentImportPreviewTable({
  rows,
}: {
  rows: StudentImportPreviewRow[]
}) {
  return (
    <section className={styles.studentsPreview} aria-labelledby="students-preview-title">
      <div className={styles.studentsPreviewHeader}>
        <h3 id="students-preview-title">Estudiantes encontrados</h3>
        <span>{rows.length} registros</span>
      </div>

      <div className={styles.previewTableWrap}>
        <table className={styles.previewTable}>
          <thead>
            <tr>
              {STUDENT_IMPORT_TABLE_COLUMNS.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.row} data-valid={row.valid}>
                {STUDENT_IMPORT_TABLE_COLUMNS.map((column) => (
                  <td key={column.key} data-label={column.label}>
                    {row.data[column.key] || '-'}
                  </td>
                ))}
                <td data-label="Estado">
                  {row.valid ? (
                    <span className={styles.readyBadge}>Listo para importar</span>
                  ) : (
                    <RowObservations row={row} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RowObservations({ row }: { row: StudentImportPreviewRow }) {
  return (
    <div className={styles.rowObservations}>
      <strong>Fila {row.row}</strong>
      <ul>
        {row.errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  )
}
