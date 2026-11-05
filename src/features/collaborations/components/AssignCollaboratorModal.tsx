import { useEffect, useId, useRef, useState } from 'react'
import {
  getCollaborationError,
  searchCollaborationUsers,
} from '../api/collaborationsApi'
import type { CollaborationUsersResponse } from '../types/collaboration.types'
import { CollaborationModal } from './CollaborationModal'
import styles from '../pages/Collaborations.module.css'
import modalStyles from './AssignCollaboratorModal.module.css'

type Props = {
  examId: number
  assignedUserIds: number[]
  onClose: () => void
  onAssign: (userId: number) => Promise<void>
}

type Lookup = { search: string; page: number; version: number }
type LookupState = {
  key: string
  response: CollaborationUsersResponse | null
  loading: boolean
  error: string | null
}

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
}

export function AssignCollaboratorModal({
  examId,
  assignedUserIds,
  onClose,
  onAssign,
}: Props) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [state, setState] = useState<LookupState>({
    key: '', response: null, loading: false, error: null,
  })
  const [userId, setUserId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const submitting = useRef(false)
  const sequence = useRef(0)
  const mounted = useRef(false)
  const key = JSON.stringify([examId, lookup])
  const current = lookup !== null && state.key === key
  const loading = lookup !== null && (!current || state.loading)
  const response = current && !loading && !state.error ? state.response : null
  const users = response?.data ?? []
  const meta = response?.meta
  const selected = users.find((candidate) => candidate.id === userId)
  const lookupError = current ? state.error : null

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    // Opening or editing the form never loads users. Only a submitted lookup does.
    if (lookup === null) return
    const controller = new AbortController()
    setState({ key, response: null, loading: true, error: null })
    void searchCollaborationUsers(
      lookup.search,
      examId,
      { page: lookup.page, per_page: 10 },
      controller.signal,
    ).then((response) => {
      if (!controller.signal.aborted)
        setState({ key, response, loading: false, error: null })
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted)
        setState({
          key, response: null, loading: false,
          error: getCollaborationError(cause, 'No se pudieron consultar los usuarios.'),
        })
    })
    return () => controller.abort()
  }, [examId, lookup, key])

  function search(search: string, page = 1) {
    if (submitting.current) return
    setUserId(null)
    setActionError(null)
    if (!search.trim()) {
      setLookup(null)
      setActionError('Ingresa un nombre, CI o correo para buscar.')
      return
    }
    setLookup({ search: search.trim(), page, version: ++sequence.current })
  }

  function close() {
    if (!submitting.current) onClose()
  }

  async function assign() {
    if (!selected || loading || submitting.current || assignedUserIds.includes(selected.id)) return
    submitting.current = true
    setBusy(true)
    setActionError(null)
    try {
      await onAssign(selected.id)
    } catch (cause) {
      if (!mounted.current) return
      setActionError(getCollaborationError(cause, 'No se pudo asignar al colaborador.', 'user_id'))
      // Keep the submitted lookup, page and results available for another selection.
      setUserId(null)
    } finally {
      submitting.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <div className={modalStyles.modalScope}>
      <CollaborationModal title="Asignar colaborador" onClose={close} busy={busy}>
        <p className={modalStyles.description}>
          Busca y selecciona un usuario para autorizarlo temporalmente en este examen.
        </p>
        <form
          className={modalStyles.searchForm}
          onSubmit={(event) => {
            event.preventDefault()
            search(query)
          }}
        >
          <div className={styles.search}>
            <label htmlFor={searchId}>Buscar por nombre, CI o correo</label>
            <input
              id={searchId}
              type="search"
              placeholder="Nombre, CI o correo"
              maxLength={255}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setLookup(null)
                setUserId(null)
                setActionError(null)
              }}
              disabled={busy}
            />
          </div>
          <button type="submit" className={styles.primaryButton} disabled={busy || !query.trim()}>
            Buscar
          </button>
        </form>
        <div className={modalStyles.results} aria-busy={loading}>
          {lookup === null ? (
            <p className={styles.empty} role="status">Busca un usuario para asignarlo como colaborador.</p>
          ) : loading ? (
            <p className={styles.empty} role="status">Buscando usuarios…</p>
          ) : lookupError ? (
            <div className={styles.error} role="alert">
              <p>{lookupError}</p>
              <button type="button" className={styles.secondaryButton} disabled={busy}
                onClick={() => search(lookup.search, lookup.page)}>
                Reintentar búsqueda
              </button>
            </div>
          ) : users.length === 0 ? (
            <p className={styles.empty} role="status">
              No se encontraron usuarios elegibles para esta búsqueda.
            </p>
          ) : (
            <ul className={modalStyles.candidates} aria-label="Usuarios elegibles">
              {users.map((candidate) => (
                <li key={candidate.id} className={modalStyles.candidate}>
                  <div className={modalStyles.candidateDetails}>
                    <strong>{candidate.display_name}</strong>
                    <dl>
                      <div><dt>CI</dt><dd>{candidate.identity_number || 'No informado'}</dd></div>
                      <div><dt>Correo</dt><dd>{candidate.email || 'No informado'}</dd></div>
                      <div>
                        <dt>Roles activos</dt>
                        <dd>{candidate.roles.map((role) => ROLE_LABELS[role] ?? role).join(', ') || 'Sin rol activo'}</dd>
                      </div>
                    </dl>
                  </div>
                  <label className={modalStyles.radioTarget}>
                    <input
                      className={modalStyles.radio}
                      type="radio"
                      name={`${searchId}-candidate`}
                      aria-label={`Seleccionar a ${candidate.display_name}`}
                      checked={userId === candidate.id}
                      disabled={busy || assignedUserIds.includes(candidate.id)}
                      onChange={() => {
                        setUserId(candidate.id)
                        setActionError(null)
                      }}
                    />
                    Seleccionar
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {meta && lookup ? (
          <nav className={modalStyles.pagination} aria-label="Paginación de candidatos">
            <p role="status">{meta.total} usuarios · Página {meta.current_page} de {meta.last_page}</p>
            <div>
              <button type="button" className={styles.secondaryButton}
                disabled={busy || loading || meta.current_page <= 1}
                onClick={() => search(lookup.search, meta.current_page - 1)}>
                Anterior
              </button>
              <button type="button" className={styles.secondaryButton}
                disabled={busy || loading || meta.current_page >= meta.last_page}
                onClick={() => search(lookup.search, meta.current_page + 1)}>
                Siguiente
              </button>
            </div>
          </nav>
        ) : null}
        {actionError ? <p className={styles.error} role="alert">{actionError}</p> : null}
        {selected ? <p role="status">Seleccionado: <strong>{selected.display_name}</strong></p> : null}
        <p className={`${styles.note} ${modalStyles.note}`}>
          Solo se muestran cuentas activas sin inscripción estudiantil activa en la
          oferta del examen y sin asignación vigente. La autorización temporal no
          modifica los roles permanentes del usuario.
        </p>
        <div className={`${styles.actions} ${modalStyles.actions}`}>
          <button type="button" className={styles.secondaryButton} onClick={close} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void assign()}
            disabled={busy || loading || !selected || assignedUserIds.includes(selected.id)}
          >
            {busy ? 'Asignando…' : 'Confirmar asignación'}
          </button>
        </div>
      </CollaborationModal>
    </div>
  )
}
