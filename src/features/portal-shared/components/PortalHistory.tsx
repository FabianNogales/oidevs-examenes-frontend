import { useCallback, useId, useState, type ReactNode } from 'react'
import { PortalFeedback } from './PortalUi'
import { publicationDate } from '../api/portalApi'
import {
  getPortalHistory,
  type HistoryValue,
  type PortalHistoryEntry,
  type PortalHistoryResource,
} from '../api/portalHistoryApi'
import { usePortalResource } from '../hooks/usePortalResource'
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
  icon: 'Icono',
  display_order: 'Orden de presentación',
  needs_review: 'Requiere revisión',
  validation_issues: 'Observaciones',
}

const informationActions: Record<string, string> = {
  FAQ_CREATED: 'FAQ creada',
  FAQ_UPDATED: 'FAQ actualizada',
  FAQ_PUBLISHED: 'FAQ publicada',
  FAQ_UNPUBLISHED: 'FAQ despublicada',
  SECTION_CREATED: 'Sección creada',
  SECTION_UPDATED: 'Sección actualizada',
  SECTION_PUBLISHED: 'Sección publicada',
  SECTION_UNPUBLISHED: 'Sección despublicada',
  PORTAL_INFORMATION_DRAFT_UPDATED: 'Borrador actualizado',
  PORTAL_INFORMATION_SECTION_CREATED: 'Sección creada',
  PORTAL_INFORMATION_SECTION_UPDATED: 'Sección actualizada',
  PORTAL_INFORMATION_SECTION_PUBLISHED: 'Sección publicada',
  PORTAL_INFORMATION_SECTION_UNPUBLISHED: 'Sección despublicada',
  PORTAL_INFORMATION_FAQ_CREATED: 'FAQ creada',
  PORTAL_INFORMATION_FAQ_UPDATED: 'FAQ actualizada',
  PORTAL_INFORMATION_FAQ_PUBLISHED: 'FAQ publicada',
  PORTAL_INFORMATION_FAQ_UNPUBLISHED: 'FAQ despublicada',
}

function label(field: string) {
  return fieldLabels[field] ?? field.replaceAll('_', ' ')
}

function informationAction(action: string, resource: PortalHistoryResource) {
  const known = informationActions[action]
  if (known && action !== 'PORTAL_INFORMATION_DRAFT_UPDATED') return known
  if (action === 'PORTAL_INFORMATION_DRAFT_UPDATED')
    return resource.endsWith('/faqs')
      ? 'FAQ actualizada'
      : 'Sección actualizada'
  const readable = action
    .replace(/^PORTAL_INFORMATION_/, '')
    .replace(/^(SECTION|FAQ)_/, '')
    .toLowerCase()
    .replaceAll('_', ' ')
  const fallback = readable
    ? `${readable[0].toUpperCase()}${readable.slice(1)}`
    : 'actualizada'
  const noun = resource.endsWith('/faqs') ? 'FAQ' : 'Sección'
  const actionLabel: Record<string, string> = {
    created: 'creada',
    updated: 'actualizada',
    published: 'publicada',
    unpublished: 'despublicada',
    deleted: 'eliminada',
  }
  return `${noun} ${actionLabel[readable] ?? fallback}`
}

function presentable(value: HistoryValue): boolean {
  if (value === null || typeof value !== 'object') return true
  return Object.values(value).some(presentable)
}

function snapshotContent(
  values: Record<string, HistoryValue> | null,
): Record<string, HistoryValue> {
  const draft = values?.draft
  return draft && typeof draft === 'object' && !Array.isArray(draft)
    ? draft
    : (values ?? {})
}

function contentValue(
  values: Record<string, HistoryValue> | null,
  keys: string[],
): HistoryValue | undefined {
  const content = snapshotContent(values)
  for (const key of keys) {
    if (Object.hasOwn(content, key)) return content[key]
  }
  return undefined
}

function flattenContent(
  value: HistoryValue,
  prefix = '',
): Map<string, HistoryValue> {
  const fields = new Map<string, HistoryValue>()
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'revision' || key === 'is_published' || key === 'status')
        continue
      const path = prefix ? `${prefix}.${key}` : key
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        for (const [nestedKey, nestedValue] of flattenContent(nested, path)) {
          fields.set(nestedKey, nestedValue)
        }
      } else {
        fields.set(path, nested)
      }
    }
  }
  return fields
}

function simpleValue(value: HistoryValue | undefined) {
  if (value === undefined) return null
  if (value === null) return 'Sin valor'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value !== 'object') return value === '' ? 'Vacío' : String(value)
  return 'Actualizado'
}

function changedInformationFields(entry: PortalHistoryEntry) {
  const previous = flattenContent(snapshotContent(entry.old_values))
  const next = flattenContent(snapshotContent(entry.new_values))
  return [...new Set([...previous.keys(), ...next.keys()])]
    .filter(
      (field) =>
        JSON.stringify(previous.get(field)) !== JSON.stringify(next.get(field)),
    )
    .map((field) => ({
      field,
      previous: previous.get(field),
      next: next.get(field),
    }))
}

function stateValue(values: Record<string, HistoryValue> | null) {
  const value = values?.is_published ?? values?.status
  if (typeof value === 'boolean') return value ? 'Publicado' : 'Despublicado'
  if (typeof value === 'string') {
    const normalized = value.toUpperCase()
    if (normalized === 'PUBLISHED') return 'Publicado'
    if (normalized === 'UNPUBLISHED') return 'Despublicado'
    if (normalized === 'DRAFT') return 'Borrador'
  }
  return null
}

function informationRevision(entry: PortalHistoryEntry) {
  const value = entry.new_values?.revision ?? entry.old_values?.revision
  return typeof value === 'number' ? value : null
}

function serviceAction(action: string) {
  const normalized = action.toUpperCase()
  if (normalized.includes('CREAT')) return 'Servicio creado'
  if (normalized.includes('ACTIVAT')) return 'Servicio activado'
  if (normalized.includes('DEACTIVAT') || normalized.includes('INACTIVAT'))
    return 'Servicio desactivado'
  if (normalized.includes('STATUS') || normalized.includes('STATE'))
    return 'Estado del servicio actualizado'
  if (normalized.includes('UPDAT') || normalized.includes('EDIT'))
    return 'Servicio actualizado'
  return 'Cambio en el servicio'
}

function serviceEntry(entry: PortalHistoryEntry) {
  const name =
    contentValue(entry.new_values, ['name']) ??
    contentValue(entry.old_values, ['name'])
  const oldStatus = entry.old_values?.status
  const newStatus = entry.new_values?.status
  const changes = changedInformationFields(entry)
  const revision = informationRevision(entry)
  return (
    <>
      <h3>{serviceAction(entry.action)}</h3>
      {typeof name === 'string' && name ? (
        <p className={styles.informationTitle}>{name}</p>
      ) : null}
      {revision !== null ? <p>Revisión {revision}</p> : null}
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
      {typeof oldStatus === 'string' && typeof newStatus === 'string' ? (
        <p>
          Estado: {oldStatus === 'ACTIVE' ? 'Activo' : 'Inactivo'} →{' '}
          {newStatus === 'ACTIVE' ? 'Activo' : 'Inactivo'}
        </p>
      ) : null}
      {changes.length ? (
        <div className={styles.informationChanges}>
          <h4>Cambios</h4>
          <ul>
            {changes.map(({ field, previous, next }) => (
              <li key={field}>
                {field
                  .split('.')
                  .map((part) =>
                    part === 'url' ? 'URL institucional' : label(part),
                  )
                  .join(' · ')}
                :{' '}
                {simpleValue(previous)} → {simpleValue(next)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {entry.actor_name !== null || entry.actor_id !== null ? (
        <p>Responsable: {entry.actor_name ?? `Usuario #${entry.actor_id}`}</p>
      ) : null}
      <details className={styles.technicalDetails}>
        <summary>Detalle técnico</summary>
        <pre>{JSON.stringify(entry, null, 2)}</pre>
      </details>
    </>
  )
}

function informationEntry(
  entry: PortalHistoryEntry,
  resource: PortalHistoryResource,
) {
  const title =
    contentValue(entry.new_values, ['title', 'question']) ??
    contentValue(entry.old_values, ['title', 'question'])
  const previousState = stateValue(entry.old_values)
  const nextState = stateValue(entry.new_values)
  const changes = changedInformationFields(entry)
  const revision = informationRevision(entry)
  return (
    <>
      <h3>{informationAction(entry.action, resource)}</h3>
      {typeof title === 'string' && title ? (
        <p className={styles.informationTitle}>{title}</p>
      ) : null}
      {revision !== null ? <p>Revisión {revision}</p> : null}
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
      {previousState !== null && nextState !== null ? (
        <p>
          Estado: {previousState} → {nextState}
        </p>
      ) : null}
      {changes.length ? (
        <div className={styles.informationChanges}>
          <h4>Cambios</h4>
          <ul>
            {changes.map(({ field, previous, next }) => (
              <li key={field}>
                {field.split('.').map(label).join(' · ')}:{' '}
                {simpleValue(previous)} → {simpleValue(next)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {entry.actor_name !== null || entry.actor_id !== null ? (
        <p>Responsable: {entry.actor_name ?? `Usuario #${entry.actor_id}`}</p>
      ) : null}
      <details className={styles.technicalDetails}>
        <summary>Detalle técnico</summary>
        <pre>{JSON.stringify(entry, null, 2)}</pre>
      </details>
    </>
  )
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
                  {resource.startsWith('information/') ? (
                    informationEntry(entry, resource)
                  ) : resource === 'services' ? (
                    serviceEntry(entry)
                  ) : (
                    <>
                      <h3>Acción: {entry.action}</h3>
                      {entry.actor_name !== null || entry.actor_id !== null ? (
                        <p>
                          Responsable:
                          {` ${entry.actor_name ?? `ID ${entry.actor_id}`}`}
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
                    </>
                  )}
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
        {open
          ? 'Ocultar historial'
          : resource === 'services'
            ? 'Historial'
            : 'Ver historial'}
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
