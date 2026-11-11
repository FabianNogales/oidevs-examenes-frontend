import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { AcademicTerm } from '../types/academicTerm.types'
import { formatAcademicTermDate } from '../utils/academicTermDate'
import { AcademicTermStatusBadge } from './AcademicTermStatusBadge'

export function AcademicTermsTable({
  terms,
  onEdit,
  onStatus,
}: {
  terms: AcademicTerm[]
  onEdit: (id: number) => void
  onStatus: (term: AcademicTerm) => void
}) {
  const columns: TableColumnDef<AcademicTerm>[] = [
    {
      id: 'name',
      header: 'Periodo',
      width: '28%',
      cell: (term) => <strong className={tableStyles.primaryText}>{term.name}</strong>,
    },
    {
      id: 'start',
      header: 'Fecha de inicio',
      cell: ({ start_date }) => (
        <time dateTime={start_date}>{formatAcademicTermDate(start_date)}</time>
      ),
    },
    {
      id: 'end',
      header: 'Fecha de fin',
      cell: ({ end_date }) => (
        <time dateTime={end_date}>{formatAcademicTermDate(end_date)}</time>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ status }) => <AcademicTermStatusBadge status={status} />,
    },
    {
      id: 'actions',
      header: 'Acciones',
      width: '28%',
      cell: (term) => {
        const isActive = term.status === 'ACTIVE'
        const action = isActive ? 'Desactivar' : 'Activar'
        return (
          <div className={tableStyles.actionButtons}>
            <button
              type="button"
              className={tableStyles.btnViewProfile}
              aria-label={`Editar periodo ${term.name}`}
              onClick={() => onEdit(term.id)}
            >
              Editar
            </button>
            <button
              type="button"
              className={isActive ? tableStyles.btnDeactivate : tableStyles.btnActivate}
              aria-label={`${action} periodo ${term.name}`}
              onClick={() => onStatus(term)}
            >
              {action}
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <section aria-label="Periodos académicos registrados">
      <DataTable columns={columns} data={terms} loading={false} entityLabel="periodos académicos" />
    </section>
  )
}
