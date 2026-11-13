import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { useCallback, useState, type FormEvent } from 'react'
import { Button } from '@/shared/components/ui/Button/Button'
import { ButtonLink } from '@/shared/components/ui/Button/ButtonLink'
import { Dropdown } from '@/shared/components/ui/Dropdown/Dropdown'
import { TextInput } from '@/shared/components/ui/Field/TextInput'
import { Snackbar } from '@/shared/components/Snackbar'
import type { AuthNotice } from '@/features/auth/types/auth'
import { RoomDialog } from '../components/RoomDialog'
import { RoomStatusDialog } from '../components/RoomStatusDialog'
import { RoomsTable } from '../components/RoomsTable'
import { useAdminRooms } from '../hooks/useAdminRooms'
import type {
  Room,
  RoomDialogSelection,
  RoomsQuery,
  RoomStatus,
} from '../types/room.types'
import styles from './AdminRoomsPage.module.css'

export function AdminRoomsPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState<RoomsQuery>({
    page: 1,
    search: '',
    status: '',
  })
  const rooms = useAdminRooms(query)
  const [selection, setSelection] = useState<RoomDialogSelection | null>(null)
  const [notice, setNotice] = useState<AuthNotice | null>(null)
  const [statusRoom, setStatusRoom] = useState<Room | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  function handleSaved(room: Room, created: boolean) {
    setSelection(null)
    setNotice({
      id: Date.now(),
      type: 'success',
      message: `Aula ${room.code} ${created ? 'registrada' : 'actualizada'} correctamente.`,
    })
    if (created && query.page !== 1) changeQuery({ ...query, page: 1 })
    else rooms.reload()
  }

  function handleStatusChanged(room: Room) {
    setStatusRoom(null)
    setNotice({
      id: Date.now(),
      type: 'success',
      message: `Aula ${room.code} ${room.status === 'ACTIVE' ? 'activada' : 'desactivada'} correctamente.`,
    })
    if (query.status && query.page > 1 && rooms.result?.data.length === 1)
      changeQuery({ ...query, page: query.page - 1 })
    else rooms.reload()
  }

  function changeQuery(next: RoomsQuery) {
    if (
      next.page === query.page &&
      next.search === query.search &&
      next.status === query.status
    )
      return
    rooms.markLoading()
    setQuery(next)
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (query.page === 1 && query.search === search.trim()) {
      rooms.reload()
      return
    }
    changeQuery({ ...query, search: search.trim(), page: 1 })
  }

  const filtered = Boolean(query.search || query.status)
  const meta = rooms.result?.meta

  return (
    <PageContainer labelledBy="rooms-title">
      <PageHeader
        title="Gestión de aulas"
        titleId="rooms-title"
        focusableTitle
        eyebrow="Administrador"
        description="Consulta y administra las aulas o ambientes disponibles en el sistema."
        breadcrumbs={[
          { label: 'Inicio', to: '/admin' },
          { label: 'Aulas' },
          { label: 'Gestionar aulas' },
        ]}
        actions={
          <>
            <ButtonLink to="/admin/rooms/import">+ Importar aulas (CSV)</ButtonLink>
            <Button onClick={() => setSelection({ mode: 'create' })}>
              + Registrar aula
            </Button>
          </>
        }
      />
      <div className={styles.card}>
        <form
          className={styles.searchBar}
          onSubmit={handleSearch}
          role="search"
          aria-label="Buscar aulas"
        >
          <div className={styles.searchField}>
            <label className={styles.srOnly} htmlFor="rooms-search">
              Buscar por nombre o código de aula
            </label>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
            <TextInput
              id="rooms-search"
              type="search"
              value={search}
              maxLength={150}
              placeholder="Buscar por nombre o código de aula"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button type="submit">Buscar</Button>
          <label className={styles.filter}>
            Estado
            <Dropdown
              value={query.status}
              options={[
                { value: '', label: 'Todos' },
                { value: 'ACTIVE', label: 'Activos' },
                { value: 'INACTIVE', label: 'Inactivos' },
              ]}
              onChange={(nextValue) =>
                changeQuery({
                  ...query,
                  page: 1,
                  status: nextValue as RoomStatus | '',
                })
              }
            />
          </label>
          {filtered && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                changeQuery({ page: 1, search: '', status: '' })
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </form>
        <p className={styles.hint}>
          El estado indica si el aula está habilitada. La disponibilidad
          corresponde al momento de la consulta.
        </p>
        <div aria-busy={rooms.status === 'loading'}>
          {rooms.status === 'loading' && (
            <div className={styles.state} role="status">
              Cargando aulas…
            </div>
          )}
          {rooms.status === 'error' && (
            <div className={styles.state} role="alert">
              <h2>No se pudieron cargar las aulas</h2>
              <p>{rooms.error}</p>
              <Button onClick={rooms.reload}>Reintentar</Button>
            </div>
          )}
          {rooms.status === 'ready' &&
            (rooms.result.data.length ? (
              <RoomsTable
                rooms={rooms.result.data}
                onDetail={(roomId) =>
                  setSelection({ mode: 'detail', roomId })
                }
                onEdit={(roomId) => setSelection({ mode: 'edit', roomId })}
                onStatusChange={setStatusRoom}
              />
            ) : (
              <div className={styles.state} role="status">
                <h2>
                  {filtered
                    ? 'No se encontraron aulas'
                    : 'No hay aulas registradas'}
                </h2>
                <p>
                  {filtered
                    ? 'Prueba con otro nombre, código o estado.'
                    : 'Las aulas registradas aparecerán aquí.'}
                </p>
              </div>
            ))}
        </div>
        {rooms.status === 'ready' && meta && meta.total > 0 && (
          <nav className={styles.pagination} aria-label="Paginación de aulas">
            <p role="status">
              {meta.from ?? 0}–{meta.to ?? 0} de {meta.total} aulas
            </p>
            <div>
              <Button
                variant="secondary"
                disabled={meta.current_page <= 1}
                onClick={() =>
                  changeQuery({ ...query, page: meta.current_page - 1 })
                }
              >
                Anterior
              </Button>
              <span>
                Página {meta.current_page} de {meta.last_page}
              </span>
              <Button
                variant="secondary"
                disabled={meta.current_page >= meta.last_page}
                onClick={() =>
                  changeQuery({ ...query, page: meta.current_page + 1 })
                }
              >
                Siguiente
              </Button>
            </div>
          </nav>
        )}
      </div>
      {selection && (
        <RoomDialog
          key={
            selection.mode === 'create'
              ? 'create'
              : `${selection.mode}-${selection.roomId}`
          }
          selection={selection}
          onClose={() => setSelection(null)}
          onSaved={handleSaved}
        />
      )}
      <Snackbar notice={notice} onDismiss={dismissNotice} />
      {statusRoom && (
        <RoomStatusDialog
          room={statusRoom}
          onClose={() => setStatusRoom(null)}
          onChanged={handleStatusChanged}
        />
      )}
    </PageContainer>
  )
}
