import { useEffect, useId, useState } from 'react'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { getEntryControlErrorMessage } from '../api/entryControlApi'
import { getEntryHistory } from '../api/entryQrApi'
import type { EntryHistoryResponse } from '../types/entryQr.types'
import {
  entryStudentName,
  formatEntryTimestamp,
} from '../utils/entryControlDisplay'
import { EntryConditionBadge } from './EntryConditionBadge'
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
  const records = (response?.data ?? []).map(({ student, entry }) => ({
    id: entry.id,
    valid: entry.status === 'VALID',
    fields: [
      { label: 'Estudiante', value: entryStudentName(student) },
      { label: 'SIS', value: student.sis_code },
      { label: 'Fecha y hora', value: formatEntryTimestamp(entry.entered_at) },
      { label: 'Método', value: entry.verification_method },
      { label: 'Verificado por', value: entry.verified_by_name || 'No informado' },
      { label: 'Estado', value: entry.status === 'VALID' ? 'Válido' : entry.status },
    ],
  }))
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
        <div className={styles.historyResults} aria-busy={loading}>
          {loading ? (
            <p className={styles.historyStatus} role="status">
              Consultando historial…
            </p>
          ) : records.length ? (
            <>
              <div
                className={`${sharedStyles.tableWrap} ${styles.historyTableWrap}`}
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
                    {records.map((record) => (
                      <tr key={record.id}>
                        {record.fields.map((field) => (
                          <td key={field.label}>{field.value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul
                className={styles.historyCards}
                aria-label="Historial completo de ingresos registrados"
              >
                {records.map((record) => (
                  <li key={record.id} className={styles.historyCard}>
                    <dl>
                      {record.fields.map((field) => (
                        <div key={field.label}>
                          <dt>{field.label}</dt>
                          <dd
                            className={
                              field.label === 'Estudiante'
                                ? styles.historyStudentName
                                : undefined
                            }
                          >
                            {field.label === 'Estado' ? (
                              <EntryConditionBadge
                                label={field.value}
                                tone={record.valid ? 'positive' : 'neutral'}
                              />
                            ) : (
                              field.value
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          ) : !error ? (
            <div className={styles.historyEmpty} role="status">
              <p className={styles.historyEmptyTitle}>
                {query.trim()
                  ? 'No se encontraron ingresos para esta búsqueda'
                  : 'Aún no hay ingresos registrados'}
              </p>
              <p>
                {query.trim()
                  ? 'Prueba con otro nombre, apellido o SIS.'
                  : 'Los ingresos registrados para este examen aparecerán aquí.'}
              </p>
            </div>
          ) : null}
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
