import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { CourseOffering } from '../types/courseOffering.types'
import local from './CourseOfferingsTable.module.css'

export function CourseOfferingsTable({
  offerings,
  showTeacher = true,
  onAction,
}: {
  offerings: CourseOffering[]
  showTeacher?: boolean
  onAction?: (id: number, mode: 'edit' | 'status') => void
}) {
  const columns: TableColumnDef<CourseOffering>[] = [
    ...(showTeacher
      ? [
          {
            id: 'teacher',
            header: 'Docente',
            width: '20%',
            cell: (offering: CourseOffering) =>
              `${offering.teacher.first_names} ${offering.teacher.last_names}`,
          },
        ]
      : []),
    {
      id: 'subject',
      header: 'Materia',
      width: showTeacher ? '24%' : undefined,
      cell: (offering) => (
        <>
          <strong className={tableStyles.primaryText}>
            {offering.subject.name}
          </strong>
          <small className={tableStyles.secondaryText}>
            {offering.subject.code}
          </small>
          {offering.subject.status === 'INACTIVE' && (
            <small className={tableStyles.secondaryText}>
              Materia inactiva en el catálogo
            </small>
          )}
        </>
      ),
    },
    {
      id: 'period',
      header: 'Periodo',
      width: showTeacher ? '18%' : undefined,
      cell: (offering) => (
        <>
          {offering.academic_term.name}
          {offering.academic_term.status === 'INACTIVE' && (
            <small className={tableStyles.secondaryText}>
              Periodo inactivo
            </small>
          )}
        </>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      accessorKey: 'status',
      width: showTeacher ? '12%' : undefined,
      cell: (offering) => (
        <span
          className={`${tableStyles.statusBadge} ${offering.status === 'ACTIVE' ? tableStyles.statusActive : tableStyles.statusInactive}`}
        >
          <span className={tableStyles.statusDot} aria-hidden="true" />
          {offering.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
    ...(onAction
      ? [
          {
            id: 'actions',
            header: 'Acciones',
            width: showTeacher ? '26%' : undefined,
            cell: (offering: CourseOffering) => (
              <div className={`${tableStyles.actionButtons} ${local.actions}`}>
                <button
                  type="button"
                  className={tableStyles.btnViewProfile}
                  onClick={() => onAction(offering.id, 'edit')}
                  aria-label={`Editar asignación de ${offering.subject.name} para ${offering.teacher.first_names} ${offering.teacher.last_names}`}
                >
                  Editar asignación
                </button>
                <button
                  type="button"
                  className={
                    offering.status === 'ACTIVE'
                      ? tableStyles.btnDeactivate
                      : tableStyles.btnActivate
                  }
                  onClick={() => onAction(offering.id, 'status')}
                  aria-label={`${offering.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} asignación de ${offering.subject.name} para ${offering.teacher.first_names} ${offering.teacher.last_names}`}
                >
                  {offering.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ),
          },
        ]
      : []),
  ]
  return (
    <section aria-label="Materias asignadas por periodo académico">
      <DataTable
        columns={columns}
        data={offerings}
        loading={false}
        entityLabel="asignaciones"
      />
    </section>
  )
}
