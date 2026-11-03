import { useState } from 'react'
import { Users } from 'lucide-react'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import type { AssignedStudent, OfflineAssignment, OfflineDistribution,} from '../types/offline.types'
import { studentName } from '../utils/offlineRules'
import shared from './styles/OfflineShared.module.css'
import distStyles from './styles/OfflineDistribution.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

type Row = AssignedStudent & { id: number; number: number }

const columns: TableColumnDef<Row>[] = [
  { id: 'number', header: 'N.º', accessorKey: 'number', width: '65px' },
  { id: 'name', header: 'Nombre completo', cell: studentName },
  { id: 'sis', header: 'SIS', accessorKey: 'sis_code' },
  { id: 'surnames', header: 'Apellidos', accessorKey: 'last_names' },
]

function AssignedStudents({
  list,
  onClose,
}: {
  list: OfflineAssignment
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const words = query.toLocaleLowerCase('es').split(/\s+/).filter(Boolean)
  const students = list.students
    .map((row, index) => ({ ...row, id: row.student_id, number: index + 1 }))
    .filter((row) =>
      words.every((word) =>
        `${studentName(row)} ${row.sis_code}`
          .toLocaleLowerCase('es')
          .includes(word),
      ),
    )

  return (
    <CollaborationModal
      title={`Lista ${list.list_id} · ${list.responsible_name ?? 'Responsable'}`}
      onClose={onClose}
    >
      <p className={shared.muted}>
        Orden y membresía definidos por el servidor. La habilitación no forma
        parte de este contrato de consulta.
      </p>
      <DataTable
        data={students}
        columns={columns}
        loading={false}
        onSearch={setQuery}
        entityLabel="estudiantes"
        searchPlaceholder="Buscar por apellidos, nombres o SIS"
        emptyTitle="No hay estudiantes en esta consulta"
      />
    </CollaborationModal>
  )
}

function getInitials(name: string | null, fallbackId: number) {
  if (!name) return `R${fallbackId}`
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((word) => word[0]?.toUpperCase() ?? '').join('')
}

export function OfflineAssignmentCards({
  distribution,
}: {
  distribution: OfflineDistribution
}) {
  const [selected, setSelected] = useState<OfflineAssignment | null>(null)

  return (
    <>
      <div className={distStyles.cardsGrid}>
        {distribution.lists.map((list, index) => {
          const rangeText =
            list.surname_range.from === null
              ? 'Sin estudiantes'
              : `${list.surname_range.from} — ${list.surname_range.to}`

          return (
            <article className={distStyles.assignmentCard} key={list.list_id}>
              <div>
                <div className={distStyles.cardHeader}>
                  <span className={distStyles.rangeBadge}>{rangeText}</span>
                  <span className={shared.badge} data-status="ACCEPTED">
                    Lista {index + 1} · v{distribution.version}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '8px',
                    marginTop: '14px',
                  }}
                >
                  <div className={distStyles.statRow}>
                    <span>Estudiantes asignados:</span>
                    <strong>{list.student_count}</strong>
                  </div>
                  <div className={distStyles.statRow}>
                    <span>Membresía:</span>
                    <span>Exclusiva por apellidos</span>
                  </div>
                </div>
              </div>

              <div className={distStyles.assigneeRow}>
                <div className={distStyles.avatarCircle} aria-hidden="true">
                  {getInitials(list.responsible_name, list.responsible_id)}
                </div>
                <div className={distStyles.assigneeDetails}>
                  <strong>
                    {list.responsible_name ??
                      `Responsable ${list.responsible_id}`}
                  </strong>
                  <span>Responsable asignado</span>
                </div>
              </div>

              <button
                type="button"
                className={buttons.secondaryButton}
                onClick={() => setSelected(list)}
              >
                <Users size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>Consultar estudiantes</span>
              </button>
            </article>
          )
        })}
      </div>

      {selected ? (
        <AssignedStudents
          key={selected.list_id}
          list={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  )
}