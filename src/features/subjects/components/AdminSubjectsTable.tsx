import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { AdminSubject } from '../types/adminSubject.types'
import styles from '../pages/AdminSubjectsPage.module.css'
import local from './AdminSubjectsTable.module.css'

export function AdminSubjectsTable({
  subjects,
  onEdit,
  onStatusChange,
}: {
  subjects: AdminSubject[]
  onEdit: (id: number) => void
  onStatusChange: (subject: AdminSubject) => void
}) {
  const columns: TableColumnDef<AdminSubject>[] = [
    {
      id: 'code',
      header: 'Código',
      width: '12%',
      cell: (subject) => (
        <strong className={tableStyles.primaryText}>{subject.code}</strong>
      ),
    },
    { id: 'name', header: 'Materia', accessorKey: 'name', width: '24%' },
    {
      id: 'careers',
      header: 'Carreras',
      width: '26%',
      cell: (subject) => (
        <div className={styles.careerList}>
          {subject.careers.length ? (
            subject.careers.map((career) => (
              <span className={styles.careerChip} key={career.id}>
                {career.name}
                {career.status === 'INACTIVE' ? ' (inactiva)' : ''}
              </span>
            ))
          ) : (
            <span className={styles.muted}>Sin carreras asociadas</span>
          )}
        </div>
      ),
    },
    { id: 'status', header: 'Estado', accessorKey: 'status', width: '12%' },
    {
      id: 'actions',
      header: 'Acciones',
      align: 'left',
      width: '26%',
      cell: (subject) => (
        <div className={`${tableStyles.actionButtons} ${local.actions}`}>
          <button
            type="button"
            className={tableStyles.btnViewProfile}
            onClick={() => onEdit(subject.id)}
            aria-label={`Editar materia ${subject.code}`}
          >
            Editar materia
          </button>
          <button
            type="button"
            className={
              subject.status === 'ACTIVE'
                ? tableStyles.btnDeactivate
                : tableStyles.btnActivate
            }
            onClick={() => onStatusChange(subject)}
            aria-label={`${subject.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} materia ${subject.code}`}
          >
            {subject.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ]
  return (
    <section aria-label="Catálogo de materias y sus carreras">
      <DataTable
        columns={columns}
        data={subjects}
        loading={false}
        entityLabel="materias"
      />
    </section>
  )
}
