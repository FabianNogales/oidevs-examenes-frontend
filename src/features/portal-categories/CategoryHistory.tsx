import { useCallback, useId, useState } from 'react'
import { PortalFeedback, PortalPager } from '@/features/portal-shared/components/PortalUi'
import { publicationDate } from '@/features/portal-shared/api/portalApi'
import { usePortalResource } from '@/features/portal-shared/hooks/usePortalResource'
import { getCategoryHistory } from './categoriesApi'
import type { CategoryCatalog, CategoryHistoryEntry } from './types'
import styles from '@/features/portal-shared/components/portalHistory.module.css'

// Only the fields and actions verified in backend 9172f18 are interpreted.
// Anything else is omitted instead of shown as raw codes, IDs or JSON.
const FIELDS = [
  { key: 'name', label: 'Nombre' },
  { key: 'is_active', label: 'Estado' },
] as const

function fieldValue(key: string, value: unknown): string | null {
  if (key === 'is_active')
    return typeof value === 'boolean' ? (value ? 'Activa' : 'Inactiva') : null
  return typeof value === 'string' ? value : null
}

function actionLabel(entry: CategoryHistoryEntry) {
  switch (entry.action) {
    case 'PORTAL_CATEGORY_CREATED':
      return 'Categoría creada'
    case 'PORTAL_CATEGORY_UPDATED':
      return 'Nombre actualizado'
    case 'PORTAL_CATEGORY_STATUS_CHANGED': {
      const next = entry.new_values?.is_active
      return next === true
        ? 'Categoría activada'
        : next === false
          ? 'Categoría desactivada'
          : 'Estado actualizado'
    }
    default:
      return 'Cambio registrado'
  }
}

function entryChanges(entry: CategoryHistoryEntry) {
  const previous = entry.old_values
  const next = entry.new_values ?? {}
  return FIELDS.flatMap(({ key, label }) => {
    const after = fieldValue(key, next[key])
    if (after === null) return []
    // Creation has no previous snapshot: show the initial values.
    if (!previous) return [{ key, text: `${label}: ${after}` }]
    const before = fieldValue(key, previous[key])
    if (before === null || before === after) return []
    return [{ key, text: `${label}: ${before} → ${after}` }]
  })
}

export function CategoryHistoryPanel({
  catalog,
  id,
}: {
  catalog: CategoryCatalog
  id: number
}) {
  const [page, setPage] = useState(1)
  const load = useCallback(
    (signal: AbortSignal) => getCategoryHistory(catalog, id, page, signal),
    [catalog, id, page],
  )
  const result = usePortalResource(load)
  const history = result.data
  return (
    <section
      className={styles.panel}
      aria-label="Historial de la categoría"
      aria-busy={result.loading}
      tabIndex={0}
    >
      <PortalFeedback {...result} retry={result.reload} />
      {history ? (
        history.data.length === 0 ? (
          <p>No hay cambios registrados para esta categoría.</p>
        ) : (
          <>
            <ol className={styles.entries}>
              {history.data.map((entry) => {
                const changes = entryChanges(entry)
                return (
                  <li key={entry.id} className={styles.entry}>
                    <h3>{actionLabel(entry)}</h3>
                    <p>Responsable: {entry.actor_name ?? 'No disponible'}</p>
                    <p>
                      Fecha:{' '}
                      {entry.created_at &&
                      !Number.isNaN(Date.parse(entry.created_at)) ? (
                        <time dateTime={entry.created_at}>
                          {publicationDate(entry.created_at)}
                        </time>
                      ) : (
                        'No disponible'
                      )}
                    </p>
                    {changes.length ? (
                      <div className={styles.informationChanges}>
                        <h4>
                          {entry.old_values ? 'Cambios' : 'Valores iniciales'}
                        </h4>
                        <ul>
                          {changes.map((change) => (
                            <li key={change.key}>{change.text}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ol>
            {history.meta.last_page > 1 ? (
              <PortalPager meta={history.meta} onPage={setPage} />
            ) : null}
          </>
        )
      ) : null}
    </section>
  )
}

export function CategoryHistory({
  catalog,
  id,
}: {
  catalog: CategoryCatalog
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
          <CategoryHistoryPanel key={`${catalog}-${id}`} catalog={catalog} id={id} />
        ) : null}
      </div>
    </div>
  )
}
