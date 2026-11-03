import { useCallback, useId, useState, type ReactNode } from 'react'
import { PortalFeedback } from './PortalUi'
import { publicationDate } from './portalApi'
import {
  getPortalHistory,
  type HistoryValue,
  type PortalHistoryEntry,
  type PortalHistoryResource,
} from './portalHistoryApi'
import { usePortalResource } from './usePortalResource'
import styles from './portalHistory.module.css'

const fieldLabels: Record<string, string> = {
  title: 'Título',
  description: 'Descripción',
  name: 'Nombre',
  summary: 'Resumen',
  content: 'Contenido',
  question: 'Pregunta',
  answer: 'Respuesta',
  category_id: 'ID de categoría',
  starts_at: 'Inicio',
  ends_at: 'Fin',
  all_day: 'Todo el día',
  location: 'Lugar',
  status: 'Estado',
  visibility: 'Visibilidad',
  published_at: 'Fecha de publicación',
  published_by: 'ID de quien publicó',
  revision: 'Revisión',
  has_image: 'Tiene imagen',
  kind: 'Tipo',
  key: 'Clave',
  is_published: 'Publicado',
  draft: 'Borrador',
  published: 'Versión publicada',
  links: 'Enlaces',
  label: 'Etiqueta',
  url: 'URL',
  sort_order: 'Orden',
  icon_key: 'Icono',
  destination_type: 'Tipo de destino',
  destination: 'Destino',
  requires_auth: 'Requiere autenticación',
}

function label(field: string) {
  return fieldLabels[field] ?? field.replaceAll('_', ' ')
}

function presentable(value: HistoryValue): boolean {
  if (value === null || typeof value !== 'object') return true
  return Object.values(value).some(presentable)
}

// Historical URLs and markup remain escaped text, never active links or HTML.
function valueContent(value: HistoryValue): ReactNode {
  if (value === null) return 'Sin valor'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value !== 'object') return value === '' ? 'Vacío' : String(value)
  if (Array.isArray(value)) {
    return (
      <ol>
        {value.filter(presentable).map((item, index) => (
          <li key={index}>{valueContent(item)}</li>
        ))}
      </ol>
    )
  }
  return (
    <dl>
      {Object.entries(value)
        .filter(([, item]) => presentable(item))
        .map(([key, item]) => (
          <div key={key}>
            <dt>{label(key)}</dt>
            <dd>{valueContent(item)}</dd>
          </div>
        ))}
    </dl>
  )
}

function changes(entry: PortalHistoryEntry) {
  const previous = entry.old_values ?? {}
  const next = entry.new_values ?? {}
  return [...new Set([...Object.keys(previous), ...Object.keys(next)])].map(
    (field) => {
      const hasOld =
        Object.hasOwn(previous, field) && presentable(previous[field])
      const hasNew = Object.hasOwn(next, field) && presentable(next[field])
      if (!hasOld && !hasNew) return null
      return (
        <div className={styles.change} key={field}>
          <h4>{label(field)}</h4>
          <dl>
            {hasOld ? (
              <div>
                <dt>Anterior</dt>
                <dd>{valueContent(previous[field])}</dd>
              </div>
            ) : null}
            {hasNew ? (
              <div>
                <dt>Nuevo</dt>
                <dd>{valueContent(next[field])}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      )
    },
  )
}

export function PortalHistoryPanel({
  resource,
  id,
}: {
  resource: PortalHistoryResource
  id: number
}) {
  const [page, setPage] = useState(1)
  const load = useCallback(
    (signal: AbortSignal) => getPortalHistory(resource, id, page, signal),
    [resource, id, page],
  )
  const result = usePortalResource(load)
  const history = result.data
  return (
    <section
      className={styles.panel}
      aria-label="Historial administrativo"
      aria-busy={result.loading}
      tabIndex={0}
    >
      <PortalFeedback {...result} retry={result.reload} />
      {history ? (
        <>
          {history.data.length === 0 ? (
            <p>No hay cambios registrados para este contenido.</p>
          ) : (
            <ol className={styles.entries}>
              {history.data.map((entry) => (
                <li key={entry.id} className={styles.entry}>
                  <h3>Acción: {entry.action}</h3>
                  {entry.actor_name !== null || entry.actor_id !== null ? (
                    <p>
                      Responsable: {entry.actor_name ?? `ID ${entry.actor_id}`}
                    </p>
                  ) : null}
                  {entry.created_at ? (
                    <p>
                      Fecha:{' '}
                      <time dateTime={entry.created_at}>
                        {Number.isNaN(Date.parse(entry.created_at))
                          ? entry.created_at
                          : publicationDate(entry.created_at)}
                      </time>
                    </p>
                  ) : null}
                  {changes(entry)}
                </li>
              ))}
            </ol>
          )}
          <nav className={styles.pager} aria-label="Paginación del historial">
            <p>
              {history.meta.total} registros · Página{' '}
              {history.meta.current_page} de {history.meta.last_page}
            </p>
            <div>
              <button
                type="button"
                disabled={!history.links.prev || history.meta.current_page <= 1}
                onClick={() => setPage(history.meta.current_page - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={
                  !history.links.next ||
                  history.meta.current_page >= history.meta.last_page
                }
                onClick={() => setPage(history.meta.current_page + 1)}
              >
                Siguiente
              </button>
            </div>
          </nav>
        </>
      ) : null}
    </section>
  )
}

export function PortalHistory({
  resource,
  id,
}: {
  resource: PortalHistoryResource
  id: number
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return (
    <div className={styles.history}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? 'Ocultar historial' : 'Ver historial'}
      </button>
      <div id={panelId}>
        {open ? (
          <PortalHistoryPanel
            key={`${resource}-${id}`}
            resource={resource}
            id={id}
          />
        ) : null}
      </div>
    </div>
  )
}
