import { useCallback, useState, type FormEvent } from 'react'
import { Snackbar } from '@/shared/components/Snackbar'
import type { AuthNotice } from '@/features/auth/types/auth'
import { RoomDialog } from '../components/RoomDialog'
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
    changeQuery({ ...query, search: search.trim(), page: 1 })
  }

  const filtered = Boolean(query.search || query.status)
  const meta = rooms.result?.meta

  return (
    <section className={styles.page} aria-labelledby="rooms-title">
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Administrador</p>
            <h1 id="rooms-title" tabIndex={-1}>
              Gestión de aulas
            </h1>
            <p className={styles.description}>
              Consulta y administra las aulas o ambientes disponibles en el
              sistema.
            </p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setSelection({ mode: 'create' })}
          >
            + Registrar aula
          </button>
        </header>
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
              <input
                id="rooms-search"
                type="search"
                value={search}
                maxLength={150}
                placeholder="Buscar por nombre o código de aula"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button className={styles.primaryButton} type="submit">
              Buscar
            </button>
            <label className={styles.filter}>
              Estado
              <select
                value={query.status}
                onChange={(event) =>
                  changeQuery({
                    ...query,
                    page: 1,
                    status: event.target.value as RoomStatus | '',
                  })
                }
              >
                <option value="">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </label>
            {filtered && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setSearch('')
                  changeQuery({ page: 1, search: '', status: '' })
                }}
              >
                Limpiar filtros
              </button>
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
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={rooms.reload}
                >
                  Reintentar
                </button>
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
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={meta.current_page <= 1}
                  onClick={() =>
                    changeQuery({ ...query, page: meta.current_page - 1 })
                  }
                >
                  Anterior
                </button>
                <span>
                  Página {meta.current_page} de {meta.last_page}
                </span>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() =>
                    changeQuery({ ...query, page: meta.current_page + 1 })
                  }
                >
                  Siguiente
                </button>
              </div>
            </nav>
          )}
        </div>
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
    </section>
  )
}
