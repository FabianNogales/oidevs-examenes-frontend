import { useEffect, useId, useState } from 'react'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { getEntryControlErrorMessage } from '../api/entryControlApi'
import { getEntryHistory } from '../api/entryQrApi'
import type { EntryHistoryResponse } from '../types/entryQr.types'
import {
  entryStudentName,
  formatEntryTimestamp,
} from '../utils/entryControlDisplay'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import entryStyles from '../pages/EntryControlPage.module.css'
import styles from './EntryQr.module.css'

export function EntryHistoryModal({
  examId,
  onClose,
}: {
  examId: number
  onClose: () => void
}) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const key = JSON.stringify([examId, query.trim(), page, version])
  const [state, setState] = useState<{
    key: string
    response: EntryHistoryResponse | null
    loading: boolean
    error: string | null
  }>({ key: '', response: null, loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    setState({ key, response: null, loading: true, error: null })
    const timeout = window.setTimeout(() => {
      void getEntryHistory(
        examId,
        { search: query.trim(), page, per_page: 10 },
        controller.signal,
      )
        .then((response) => {
          if (!controller.signal.aborted)
            setState({ key, response, loading: false, error: null })
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted)
            setState({
              key,
              response: null,
              loading: false,
              error: getEntryControlErrorMessage(
                cause,
                'No se pudo consultar el historial de ingresos.',
              ),
            })
        })
    }, 300)
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [examId, query, page, key])

  const current = state.key === key
  const loading = !current || state.loading
  const response = current && !loading ? state.response : null
  const error = current ? state.error : null
  const meta = response?.meta
  return (
    <div className={styles.historyModal}>
      <CollaborationModal
        title="Historial completo de ingresos"
        onClose={onClose}
      >
        <div className={entryStyles.field}>
          <label htmlFor={searchId}>Buscar estudiante</label>
          <input
            id={searchId}
            type="search"
            placeholder="Nombre, apellido o SIS"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
        </div>
        {error ? (
          <div role="alert">
            <p className={sharedStyles.error}>{error}</p>
            <button
              type="button"
              className={sharedStyles.secondaryButton}
              onClick={() => setVersion((value) => value + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : null}
        <div
          className={`${sharedStyles.tableWrap} ${styles.historyTableWrap}`}
          aria-busy={loading}
        >
          <table
            className={`${sharedStyles.table} ${styles.historyTable}`}
            aria-label="Historial completo de ingresos registrados"
          >
            <thead>
              <tr>
                <th scope="col">Estudiante</th>
                <th scope="col">SIS</th>
                <th scope="col">Fecha y hora</th>
                <th scope="col">Método</th>
                <th scope="col">Verificador</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {response?.data.map((record) => (
                <tr key={record.entry.id}>
                  <td>{entryStudentName(record.student)}</td>
                  <td>{record.student.sis_code}</td>
                  <td>{formatEntryTimestamp(record.entry.entered_at)}</td>
                  <td>{record.entry.verification_method}</td>
                  <td>{record.entry.verified_by_name || 'No informado'}</td>
                  <td>
                    {record.entry.status === 'VALID'
                      ? 'Válido'
                      : record.entry.status}
                  </td>
                </tr>
              ))}
              {!response?.data.length ? (
                <tr>
                  <td colSpan={6} className={sharedStyles.empty} role="status">
                    {loading
                      ? 'Consultando historial…'
                      : error
                        ? 'No se pudo consultar el historial.'
                        : 'No hay ingresos registrados.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {meta ? (
          <nav
            className={entryStyles.pagination}
            aria-label="Paginación del historial"
          >
            <p role="status">
              {meta.total} ingresos · Página {meta.current_page} de{' '}
              {meta.last_page} · {meta.per_page} por página
            </p>
            <div>
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={loading || meta.current_page <= 1}
                onClick={() => setPage(meta.current_page - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={loading || meta.current_page >= meta.last_page}
                onClick={() => setPage(meta.current_page + 1)}
              >
                Siguiente
              </button>
            </div>
          </nav>
        ) : null}
        <div className={sharedStyles.actions}>
          <button
            type="button"
            className={sharedStyles.secondaryButton}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </CollaborationModal>
    </div>
  )
}
