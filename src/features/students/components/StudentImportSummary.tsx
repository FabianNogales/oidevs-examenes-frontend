import type { StudentImportPreview } from '@/features/students/types/studentImport'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

type FilterType = 'all' | 'valid' | 'invalid'

export function StudentImportSummary({
  preview,
  currentFilter,
  onFilterChange,
}: {
  preview: StudentImportPreview
  currentFilter: FilterType
  onFilterChange: (filter: FilterType) => void
}) {
  return (
    <section className={styles.previewPanel} aria-labelledby="student-import-summary-title">
      <h3 id="student-import-summary-title">Resumen de importacion</h3>
      <div className={styles.previewSummary}>
        <SummaryItem 
          label="Total de registros" 
          value={preview.total_rows}
          isActive={currentFilter === 'all'}
          onClick={() => onFilterChange('all')} 
        />
        <SummaryItem 
          label="Listos para importar" 
          value={preview.valid_rows}
          isActive={currentFilter === 'valid'}
          onClick={() => onFilterChange('valid')} 
        />
        <SummaryItem 
          label="Con observaciones" 
          value={preview.error_rows}
          isActive={currentFilter === 'invalid'}
          onClick={() => onFilterChange('invalid')} 
        />
      </div>
    </section>
  )
}

function SummaryItem({ 
  label, 
  value, 
  isActive, 
  onClick 
}: { 
  label: string
  value: number
  isActive: boolean
  onClick: () => void 
}) {
  return (
    <button 
      type="button"
      className={styles.summaryItem}
      data-active={isActive} 
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  )
}