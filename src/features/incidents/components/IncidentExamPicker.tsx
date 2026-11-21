import { useId } from 'react'
import { SearchBar } from '@/shared/components/ui/SearchBar'
import { useRetryFocus } from '@/shared/hooks/useRetryFocus'
import type { IncidentsPage } from '../types/incident.types'
import { useIncidentExamCatalog } from '../hooks/useIncidentExamCatalog'
import styles from './IncidentExamPicker.module.css'

export function IncidentExamPicker({
  selectedId,
  exam,
  onSelect,
}: {
  selectedId: number | null
  exam?: IncidentsPage['exam']
  onSelect: (id: number) => void
}) {
  const id = useId()
  const catalog = useIncidentExamCatalog()
  const response = catalog.response
  const { retryRef, markRetry } = useRetryFocus(
    catalog.loading,
    Boolean(catalog.error),
  )
  return (
    <section
      className={styles.picker}
      aria-label="Seleccionar examen para consultar incidencias"
    >
      <h2>Seleccionar examen</h2>
      <SearchBar
        id={id}
        label="Buscar por examen o materia"
        showLabel
        value={catalog.query}
        placeholder="Escribe el nombre del examen o materia"
        onChange={(nextQuery) => catalog.setQuery(nextQuery)}
      />
      {selectedId && (
        <p>
          Examen seleccionado:{' '}
          <strong>
            {exam ? `${exam.name} · ${exam.subject_name}` : `#${selectedId}`}
          </strong>
        </p>
      )}
      {catalog.loading ? (
        <p role="status">Consultando exámenes…</p>
      ) : catalog.error ? (
        <div role="alert">
          <p>{catalog.error}</p>
          <button
            ref={retryRef}
            type="button"
            onClick={() => {
              markRetry()
              catalog.retry()
            }}
          >
            Reintentar
          </button>
        </div>
      ) : response?.data.length ? (
        <ul>
          {response.data.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={item.id === selectedId}
                onClick={() => onSelect(item.id)}
              >
                <strong>{item.name}</strong>
                <span>
                  {item.subject_name} · {item.exam_date}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status">No se encontraron exámenes para esta búsqueda.</p>
      )}
      {response && (
        <nav aria-label="Paginación de exámenes">
          <button
            type="button"
            disabled={response.meta.current_page <= 1}
            onClick={() => catalog.setPage(response.meta.current_page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {response.meta.current_page} de {response.meta.last_page}
          </span>
          <button
            type="button"
            disabled={response.meta.current_page >= response.meta.last_page}
            onClick={() => catalog.setPage(response.meta.current_page + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  )
}
