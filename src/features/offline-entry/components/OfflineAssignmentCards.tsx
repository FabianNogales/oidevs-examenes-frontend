import { useState } from 'react'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import type {
  AssignedStudent,
  OfflineAssignment,
  OfflineDistribution,
} from '../types/offline.types'
import { studentName } from '../utils/offlineRules'
import styles from './OfflineEntry.module.css'
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
      <p className={styles.muted}>
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
export function OfflineAssignmentCards({
  distribution,
}: {
  distribution: OfflineDistribution
}) {
  const [selected, setSelected] = useState<OfflineAssignment | null>(null)
  return (
    <>
      <div className={styles.grid}>
        {distribution.lists.map((list, index) => (
          <article className={styles.panel} key={list.list_id}>
            <div className={styles.toolbar}>
              <p className={styles.eyebrow}>Lista {index + 1}</p>
              <span className={styles.badge}>
                Preparada · v{distribution.version}
              </span>
            </div>
            <h2>
              {list.responsible_name ?? `Responsable ${list.responsible_id}`}
            </h2>
            <p>
              {list.surname_range.from === null
                ? 'Sin estudiantes asignados'
                : `${list.surname_range.from} — ${list.surname_range.to}`}
            </p>
            <p>
              <strong>{list.student_count}</strong> estudiantes · Membresía
              exclusiva
            </p>
            <button
              className={buttons.secondaryButton}
              onClick={() => setSelected(list)}
            >
              Consultar estudiantes
            </button>
          </article>
        ))}
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
