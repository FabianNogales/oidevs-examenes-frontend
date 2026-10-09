import type {
  StudentImportColumn,
  StudentImportPreviewRow,
} from '@/features/students/types/studentImport'
import styles from './StudentImportDesign.module.css'

const STUDENT_IMPORT_TABLE_COLUMNS: ReadonlyArray<{
  key: StudentImportColumn
  label: string
  width: number
  keywords: string[]
}> = [
  { key: 'sis_code', label: 'SIS', width: 130, keywords: ['sis', 'sis_code', 'codigo', 'código'] },
  { key: 'identity_number', label: 'CI', width: 130, keywords: ['ci', 'carnet', 'identidad', 'identity_number'] },
  { key: 'first_names', label: 'Nombres', width: 210, keywords: ['nombre', 'nombres', 'first_names'] },
  { key: 'last_names', label: 'Apellidos', width: 210, keywords: ['apellido', 'apellidos', 'last_names'] },
  { key: 'email', label: 'Correo', width: 310, keywords: ['correo', 'email'] },
  { key: 'career', label: 'Carrera', width: 155, keywords: ['carrera', 'career'] },
  { key: 'profile_photo', label: 'Foto de perfil', width: 141, keywords: ['foto', 'profile_photo'] },
]

const TOTAL_WIDTH = STUDENT_IMPORT_TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0)

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-záéíóúñ0-9_]+/).filter(Boolean)
}

function toCellMessage(error: string): string {
  return /existe|registrad|duplicad/i.test(error) ? 'Ya existe' : error
}

function mapRowErrors(row: StudentImportPreviewRow) {
  const byColumn: Partial<Record<StudentImportColumn, string>> = {}
  const unmatched: string[] = []

  for (const error of row.errors) {
    const tokens = tokenize(error)
    const column = STUDENT_IMPORT_TABLE_COLUMNS.find((c) =>
      c.keywords.some((k) => tokens.includes(k)),
    )
    if (column && !byColumn[column.key]) {
      byColumn[column.key] = toCellMessage(error)
    } else {
      unmatched.push(error)
    }
  }

  return { byColumn, unmatched }
}

export function StudentImportPreviewTable({
  rows,
}: {
  rows: StudentImportPreviewRow[]
}) {
  const mapped = rows.map((row) => (row.valid ? null : mapRowErrors(row)))
  const hasGeneralNotes = mapped.some((m) => m && m.unmatched.length > 0)
  const scale = hasGeneralNotes ? 0.8 : 1

  return (
    <section className={styles.studentsPreview} aria-labelledby="students-preview-title">
      <div className={styles.studentsPreviewHeader}>
        <h3 id="students-preview-title">Tabla de Estudiantes</h3>
      </div>

      <div className={styles.previewTableWrap}>
        <table className={styles.previewTable}>
          <colgroup>
            {STUDENT_IMPORT_TABLE_COLUMNS.map((column) => (
              <col
                key={column.key}
                style={{ width: `${((column.width / TOTAL_WIDTH) * 100 * scale).toFixed(2)}%` }}
              />
            ))}
            {hasGeneralNotes && <col style={{ width: '20%' }} />}
          </colgroup>
          <thead>
            <tr>
              {STUDENT_IMPORT_TABLE_COLUMNS.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
              {hasGeneralNotes && <th scope="col">Observaciones</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowErrors = mapped[index]
              return (
                <tr key={row.row} data-valid={row.valid}>
                  {STUDENT_IMPORT_TABLE_COLUMNS.map((column) => {
                    const issue = rowErrors?.byColumn[column.key]
                    let cellContent: React.ReactNode = row.data[column.key] || '-'
                    if (column.key === 'profile_photo') {
                      const textVal = String(row.data[column.key] || '').toLowerCase()
                      const hasImage = textVal.includes('.png') || textVal.includes('.jpg') || textVal.includes('.jpeg') || textVal.includes('.webp')
                      cellContent = (
                        <span className={hasImage ? styles.photoYes : styles.photoNo}>
                          {hasImage ? 'Con foto' : 'Sin foto'}
                        </span>
                      )
                    }

                    return (
                      <td key={column.key} data-label={column.label}>
                        <div className={styles.cellMain}>{cellContent}</div>
                        {issue && <div className={styles.cellIssue}>{issue}</div>}
                      </td>
                    )
                  })}
                  {hasGeneralNotes && (
                    <td data-label="Observaciones">
                      {rowErrors && rowErrors.unmatched.length > 0 ? (
                        <div className={styles.rowObservations}>
                          <strong>Fila {row.row}</strong>
                          <ul>
                            {rowErrors.unmatched.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}