import { useCallback, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { getAdminEvents, getEventCategories } from '../api/portalCalendarApi'
import { AdminEventDialog } from '../components/AdminEventDialog'
import { STATUS_LABELS, VISIBILITY_LABELS } from '../types'
import { useCalendarResource } from '../hooks/useCalendarResource'
import type { AdminPortalEvent, EventStatus, EventVisibility } from '../types'
import { eventDateLabel } from '../utils/calendarDates'
import styles from '../portalCalendar.module.css'

// DataTable reserves `status` for ACTIVE/INACTIVE. Keep the calendar state separately.
type EventRow = Omit<AdminPortalEvent, 'status'> & { eventStatus: EventStatus }
const columns: readonly TableColumnDef<EventRow>[] = [
  { id: 'title', header: 'Título', accessorKey: 'title' },
  {
    id: 'date',
    header: 'Fecha',
    cell: (event) => eventDateLabel({ ...event, status: event.eventStatus }),
  },
  { id: 'category', header: 'Categoría', cell: (event) => event.category.name },
  {
    id: 'status',
    header: 'Estado',
    cell: (event) => STATUS_LABELS[event.eventStatus],
  },
  {
    id: 'visibility',
    header: 'Visibilidad',
    cell: (event) => VISIBILITY_LABELS[event.visibility],
  },
]

export function AdminCalendarPage() {
  const { notify } = useAuth()
  const [query, setQuery] = useState({
    page: 1,
    search: '',
    status: '',
    category: '',
    visibility: '',
  })
  const [selected, setSelected] = useState<{ id: number | null } | null>(null)
  const loadCategories = useCallback(
    (signal: AbortSignal) => getEventCategories(true, signal),
    [],
  )
  const categories = useCalendarResource(loadCategories)
  const load = useCallback(
    (signal: AbortSignal) =>
      getAdminEvents(
        {
          page: query.page,
          per_page: 15,
          search: query.search,
          ...(query.status ? { status: query.status as EventStatus } : {}),
          ...(query.category ? { category_id: Number(query.category) } : {}),
          ...(query.visibility
            ? { visibility: query.visibility as EventVisibility }
            : {}),
        },
        signal,
      ),
    [query],
  )
  const list = useCalendarResource(load)
  const meta = list.data?.meta
  const rows = (list.data?.data ?? []).map(({ status, ...event }) => ({
    ...event,
    eventStatus: status,
  }))

  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: 'Inicio', to: '/' },
          { label: 'Calendario institucional' },
        ]}
      />
      <header className={styles.toolbar}>
        <div>
          <h1>Gestión del calendario</h1>
          <p>Eventos institucionales públicos y privados.</p>
        </div>
        <button
          type="button"
          className={styles.primary}
          disabled={
            categories.loading || !!categories.error || !categories.data?.length
          }
          onClick={() => setSelected({ id: null })}
        >
          Crear evento
        </button>
      </header>
      {categories.loading ? (
        <p role="status">Cargando categorías…</p>
      ) : categories.error ? (
        <div role="alert" className={styles.error}>
          <p>{categories.error.message}</p>
          <button type="button" onClick={categories.reload}>
            Reintentar categorías
          </button>
        </div>
      ) : !categories.data?.length ? (
        <p role="status" className={styles.notice}>
          No hay categorías de eventos disponibles.
        </p>
      ) : null}
      <div className={styles.filters}>
        <label className={styles.field}>
          Visibilidad
          <select
            name="visibility"
            value={query.visibility}
            onChange={(event) =>
              setQuery({ ...query, page: 1, visibility: event.target.value })
            }
          >
            <option value="">Todas</option>
            <option value="PUBLIC">Públicas</option>
            <option value="PRIVATE">Privadas</option>
          </select>
        </label>
        <label className={styles.field}>
          Estado
          <select
            name="status"
            value={query.status}
            onChange={(event) =>
              setQuery({ ...query, page: 1, status: event.target.value })
            }
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {categories.data?.length ? (
          <label className={styles.field}>
            Categoría
            <select
              name="category_id"
              value={query.category}
              onChange={(event) =>
                setQuery({ ...query, page: 1, category: event.target.value })
              }
            >
              <option value="">Todas las categorías</option>
              {categories.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <DataTable<EventRow>
        columns={columns}
        data={rows}
        loading={list.loading}
        error={list.error?.message}
        entityLabel="eventos"
        viewActionLabel="Gestionar evento"
        onViewProfile={(event) => setSelected({ id: event.id })}
        pagination={
          meta
            ? {
                currentPage: meta.current_page,
                lastPage: meta.last_page,
                total: meta.total,
                from: rows.length
                  ? (meta.current_page - 1) * meta.per_page + 1
                  : 0,
                to: rows.length
                  ? (meta.current_page - 1) * meta.per_page + rows.length
                  : 0,
              }
            : null
        }
        onPageChange={(page) => setQuery({ ...query, page })}
        onSearch={(search) =>
          setQuery({ ...query, page: 1, search: search.slice(0, 200) })
        }
        searchPlaceholder="Buscar por título, descripción o ubicación"
        onRetry={list.reload}
        emptyTitle="No hay eventos institucionales"
        emptyDescription="Crea un borrador cuando el catálogo de categorías esté disponible."
      />
      {selected ? (
        <AdminEventDialog
          key={selected.id ?? 'new'}
          eventId={selected.id}
          categories={categories.data ?? []}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null)
            setQuery((current) => ({ ...current, page: 1 }))
            list.reload()
            notify('success', 'El evento institucional fue guardado.')
          }}
        />
      ) : null}
    </div>
  )
}
