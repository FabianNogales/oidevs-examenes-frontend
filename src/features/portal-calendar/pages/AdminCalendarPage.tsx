import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminStatusBadge } from '@/features/portal-shared/components/AdminStatusBadge'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'

import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { getAdminEvents, getEventCategories } from '../api/portalCalendarApi'
import { AdminEventDialog } from '../components/AdminEventDialog'
import { STATUS_LABELS, VISIBILITY_LABELS } from '../types/calendar.types'
import { useCalendarResource } from '../hooks/useCalendarResource'
import type { AdminPortalEvent, EventStatus, EventVisibility } from '../types/calendar.types'
import { boliviaInput, eventDateLabel } from '../utils/calendarDates'
import styles from './portalCalendar.module.css'

// DataTable reserves `status` for ACTIVE/INACTIVE. Keep the calendar state separately.
type EventRow = Omit<AdminPortalEvent, 'status'> & { eventStatus: EventStatus }
const columns: readonly TableColumnDef<EventRow>[] = [
  { id: 'title', header: 'Título', accessorKey: 'title' },
  {
    id: 'date',
    header: 'Fecha y horario',
    cell: (event) => {
      const start = boliviaInput(event.starts_at)
      const end = boliviaInput(event.ends_at)
      if (event.all_day || start.slice(0, 10) !== end.slice(0, 10))
        return eventDateLabel({ ...event, status: event.eventStatus })
      // A single container keeps date and time in the value column of the mobile card grid.
      return (
        <div>
          <time dateTime={event.starts_at}>
            {new Intl.DateTimeFormat('es-BO', {
              timeZone: 'America/La_Paz',
              dateStyle: 'medium',
            }).format(new Date(event.starts_at))}
          </time>
          <div className={styles.help}>
            {start.slice(11, 16)} – {end.slice(11, 16)}
          </div>
        </div>
      )
    },
  },
  { id: 'category', header: 'Categoría', cell: (event) => event.category.name },
  {
    id: 'status',
    header: 'Estado',
    cell: (event) => (
      <AdminStatusBadge status={event.eventStatus}>
        {STATUS_LABELS[event.eventStatus]}
      </AdminStatusBadge>
    ),
  },
  {
    id: 'visibility',
    header: 'Visibilidad',
    cell: (event) => (
      <span className={styles.badge} data-visibility={event.visibility}>
        {VISIBILITY_LABELS[event.visibility]}
      </span>
    ),
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
  const [searchInput, setSearchInput] = useState('')
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
  // Last response of the exact query: `load` changes with any query field.
  const [settled, setSettled] = useState<{
    load: typeof load
    data: NonNullable<typeof list.data>
  } | null>(null)
  if (list.data && settled?.data !== list.data) {
    setSettled({ load, data: list.data })
  }
  // Only the reload requested after a save keeps those rows mounted, so the
  // Drawer can return focus to the "Gestionar" button that opened it.
  const [savedReload, setSavedReload] = useState<typeof load | null>(null)
  if (savedReload && (savedReload !== load || !list.loading)) {
    setSavedReload(null)
  }
  const refreshing =
    list.loading && savedReload === load && settled?.load === load
  const visible = refreshing && settled ? settled.data : list.data
  const heading = useRef<HTMLHeadingElement>(null)
  const focusAfterSave = useRef(false)
  useEffect(() => {
    if (list.loading || !focusAfterSave.current) return
    focusAfterSave.current = false
    // The saved row may leave the current results (e.g. a filter): keep focus
    // on an accessible target instead of <body>.
    if (!document.activeElement || document.activeElement === document.body)
      heading.current?.focus()
  }, [list.loading])
  const meta = visible?.meta
  const rows = (visible?.data ?? []).map(({ status, ...event }) => ({
    ...event,
    eventStatus: status,
  }))

  return (
    <PageContainer>
      <PageHeader title="Gestión del calendario" titleRef={heading} focusableTitle
        description="Eventos institucionales públicos y privados."
        breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Gestión del calendario' }]}
        actions={<button
          type="button"
          className={styles.primary}
          disabled={
            categories.loading || !!categories.error || !categories.data?.length
          }
          onClick={() => setSelected({ id: null })}
        >
          Crear evento
        </button>} />
      <p className={styles.categoriesLink}>
        <Link to="/admin/portal/events/categories">Gestionar categorías</Link>
      </p>
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
      <section
        className={styles.filterPanel}
        aria-label="Buscar y filtrar eventos"
      >
        <form
          className={styles.searchRow}
          onSubmit={(event) => {
            event.preventDefault()
            setQuery({
              ...query,
              page: 1,
              search: searchInput.trim().slice(0, 200),
            })
          }}
        >
          <label className={styles.field}>
            Buscar eventos
            <input
              type="search"
              name="search"
              maxLength={200}
              placeholder="Título, descripción o ubicación"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>
          <button type="submit" disabled={list.loading}>
            Buscar
          </button>
        </form>
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
        {query.search ||
        query.visibility ||
        query.status ||
        query.category ||
        searchInput ? (
          <button
            type="button"
            onClick={() => {
              setSearchInput('')
              setQuery({
                page: 1,
                search: '',
                status: '',
                category: '',
                visibility: '',
              })
            }}
          >
            Limpiar filtros
          </button>
        ) : null}
        {query.search ? (
          <p className={styles.help}>
            Resultados para: <strong>{query.search}</strong>
          </p>
        ) : null}
      </section>
      <div className={styles.adminTable} aria-busy={refreshing}>
        <DataTable<EventRow>
          columns={columns}
          data={rows}
          loading={list.loading && !refreshing}
          error={list.error?.message}
          entityLabel="eventos"
          viewActionLabel="Gestionar"
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
          onRetry={list.reload}
          emptyTitle={
            query.search || query.status || query.category || query.visibility
              ? 'No hay resultados para estos filtros'
              : 'No hay eventos institucionales'
          }
          emptyDescription={
            query.search || query.status || query.category || query.visibility
              ? 'Prueba otros términos o limpia los filtros.'
              : 'Crea un borrador cuando el catálogo de categorías esté disponible.'
          }
        />
      </div>
      {selected ? (
        <AdminEventDialog
          key={selected.id ?? 'new'}
          eventId={selected.id}
          categories={categories.data ?? []}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null)
            setSavedReload(() => load)
            focusAfterSave.current = true
            list.reload()
            notify('success', 'El evento institucional fue guardado.')
          }}
        />
      ) : null}
    </PageContainer>
  )
}
