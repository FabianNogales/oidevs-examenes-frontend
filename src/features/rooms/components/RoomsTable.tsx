import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { Room } from '../types/room.types'
import styles from '../pages/AdminRoomsPage.module.css'
import local from './RoomsTable.module.css'

export function RoomsTable({
  rooms,
  onDetail,
  onEdit,
  onStatusChange,
}: {
  rooms: Room[]
  onDetail: (roomId: number) => void
  onEdit: (roomId: number) => void
  onStatusChange: (room: Room) => void
}) {
  const columns: TableColumnDef<Room>[] = [
    {
      id: 'code',
      header: 'Código',
      width: '12%',
      cell: (room) => (
        <strong className={tableStyles.primaryText}>{room.code}</strong>
      ),
    },
    {
      id: 'name',
      header: 'Nombre / ubicación',
      width: '24%',
      cell: (room) => (
        <>
          <strong className={tableStyles.primaryText}>
            {room.name || 'Sin nombre'}
          </strong>
          <small className={tableStyles.secondaryText}>
            {room.location || room.description || 'Sin ubicación registrada'}
          </small>
        </>
      ),
    },
    { id: 'status', header: 'Estado', accessorKey: 'status', width: '14%' },
    {
      id: 'availability',
      header: 'Disponibilidad actual',
      width: '18%',
      cell: (room) =>
        room.status === 'INACTIVE' ? (
          <span className={styles.muted}>No habilitada</span>
        ) : (
          <span
            className={
              room.availability === 'AVAILABLE'
                ? styles.successBadge
                : room.availability === 'OCCUPIED'
                  ? styles.warningBadge
                  : styles.neutralBadge
            }
          >
            {room.availability === 'AVAILABLE'
              ? 'Disponible'
              : room.availability === 'OCCUPIED'
                ? 'Ocupada'
                : 'Sin información'}
          </span>
        ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      align: 'left',
      width: '32%',
      cell: (room) => (
        <div className={`${tableStyles.actionButtons} ${local.actions}`}>
          <button
            type="button"
            className={tableStyles.btnViewProfile}
            onClick={() => onDetail(room.id)}
            aria-label={`Ver detalle de ${room.code}`}
          >
            Ver detalle
          </button>
          <button
            type="button"
            className={tableStyles.btnViewProfile}
            onClick={() => onEdit(room.id)}
            aria-label={`Editar ${room.code}`}
          >
            Editar
          </button>
          <button
            type="button"
            className={
              room.status === 'ACTIVE'
                ? tableStyles.btnDeactivate
                : tableStyles.btnActivate
            }
            onClick={() => onStatusChange(room)}
            aria-label={`${room.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} ${room.code}`}
          >
            {room.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ]
  return (
    <section aria-label="Listado de aulas">
      <DataTable
        columns={columns}
        data={rooms}
        loading={false}
        entityLabel="aulas"
      />
    </section>
  )
}
