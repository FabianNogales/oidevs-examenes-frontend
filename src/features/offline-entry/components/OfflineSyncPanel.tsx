import { useState, type ComponentType } from 'react'
import { CheckCircle2, Clock, Copy, Inbox, Info, ListFilter, RefreshCw, Search, XCircle,} from 'lucide-react'
import type { useOfflineSync } from '../hooks/useOfflineSync'
import type { LocalEntry, StoredPackage } from '../types/offline.types'
import { formatOfflineTime, studentName } from '../utils/offlineRules'
import shared from './styles/OfflineShared.module.css'
import syncStyles from './styles/OfflineSyncPanel.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

const labels: Record<LocalEntry['status'], string> = {
  PENDING: 'Pendiente de envío',
  ACCEPTED: 'Aceptado',
  DUPLICATE: 'Duplicado',
  CONFLICT: 'Necesita revisión',
  REJECTED: 'Rechazado',
}

const descriptions: Record<LocalEntry['status'], string> = {
  PENDING: 'Ingreso guardado en este dispositivo. Pendiente de sincronización.',
  ACCEPTED: 'Ingreso sincronizado exitosamente.',
  DUPLICATE: 'El estudiante ya tiene un ingreso registrado.',
  CONFLICT: 'El registro necesita revisión.',
  REJECTED: 'El registro fue rechazado.',
}

const statusIcons: Record<
  LocalEntry['status'],
  ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
> = {
  PENDING: Clock,
  ACCEPTED: CheckCircle2,
  DUPLICATE: Copy,
  CONFLICT: Search,
  REJECTED: XCircle,
}

type FilterOption = 'ALL' | LocalEntry['status']

export function OfflineSyncPanel({
  entries,
  packages,
  sync,
  canRequest,
}: {
  entries: LocalEntry[]
  packages: StoredPackage[]
  sync: ReturnType<typeof useOfflineSync>
  canRequest: boolean
}) {
  const [filter, setFilter] = useState<FilterOption>('ALL')
  const [limit, setLimit] = useState(25)

  const pending = entries.filter((entry) => entry.status === 'PENDING').length
  const visible = entries
    .filter((entry) => filter === 'ALL' || entry.status === filter)
    .toReversed()

  const statusList = Object.keys(labels) as LocalEntry['status'][]

  return (
    <section className={shared.panel} aria-labelledby="offline-sync-title">
      <div>
        <p className={shared.eyebrow}>HU37 · Confirmación del servidor</p>
        <h2 id="offline-sync-title">Sincronización de ingresos</h2>
        <p className={shared.panelSubtitle}>
          Se envían únicamente eventos pendientes, conservando sus UUID y
          paquetes originales. Cada resultado se guarda por separado.
        </p>
      </div>

      <hr className={shared.sectionDivider} />

      <div className={syncStyles.syncToolbarRow}>
        <button
          type="button"
          className={syncStyles.syncActionButton}
          disabled={!canRequest || sync.busy || pending === 0}
          onClick={() => void sync.synchronize()}
        >
          <RefreshCw size={16} strokeWidth={1.85} aria-hidden="true" />
          <span>
            {sync.busy
              ? `Sincronizando… ${sync.progress} procesados`
              : `Sincronizar ahora${pending ? ` (${pending})` : ''}`}
          </span>
        </button>

        <p className={syncStyles.inlineHint}>
          <Info size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            “Red disponible” no garantiza acceso a Laravel. No hay reintentos
            automáticos ni envío en segundo plano.
          </span>
        </p>
      </div>

      {!canRequest ? (
        <p className={shared.muted}>
          Necesitas conexión y una sesión comprobada con el servidor para
          sincronizar.
        </p>
      ) : null}

      {sync.summary ? (
        <p className={shared.notice} role="status">
          {sync.summary}
        </p>
      ) : null}

      {sync.error ? (
        <p className={shared.error} role="alert">
          {sync.error} Los UUID pendientes no se modificaron.
        </p>
      ) : null}

      <div className={syncStyles.eventsSection}>
        <div className={syncStyles.eventsHeader}>
          <span className={syncStyles.eventsHeaderIcon} aria-hidden="true">
            <ListFilter size={18} strokeWidth={1.85} />
          </span>
          <h3>Eventos de este dispositivo</h3>
          {filter !== 'ALL' ? (
            <button
              type="button"
              className={syncStyles.clearFilterButton}
              onClick={() => {
                setFilter('ALL')
                setLimit(25)
              }}
            >
              Ver todos ({entries.length})
            </button>
          ) : null}
        </div>

        <div className={syncStyles.filterGroup}>
          <span className={syncStyles.filterLabel} id="sync-filter-label">
            Filtrar resultados
          </span>

          <div
            className={syncStyles.filterCardsGrid}
            role="group"
            aria-labelledby="sync-filter-label"
          >
            {statusList.map((status) => {
              const count = entries.filter(
                (entry) => entry.status === status,
              ).length
              const isSelected = filter === status
              const StatusIcon = statusIcons[status]

              return (
                <button
                  key={status}
                  type="button"
                  className={syncStyles.filterCard}
                  data-active={isSelected ? 'true' : 'false'}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setFilter((current) =>
                      current === status ? 'ALL' : status,
                    )
                    setLimit(25)
                  }}
                >
                  <div className={syncStyles.filterCardTop}>
                    <strong className={syncStyles.filterCardCount}>
                      {count}
                    </strong>
                    <StatusIcon
                      size={20}
                      strokeWidth={1.65}
                      className={syncStyles.filterCardIcon}
                    />
                  </div>
                  <span className={syncStyles.filterCardTitle}>
                    {labels[status]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className={syncStyles.emptyEventsBox}>
            <div className={syncStyles.emptyEventsIcon} aria-hidden="true">
              <Inbox size={24} strokeWidth={1.65} />
            </div>
            <p>
              No hay eventos para este filtro. Las capturas locales aparecerán
              aquí.
            </p>
          </div>
        ) : (
          <ol className={syncStyles.resultList}>
            {visible.slice(0, limit).map((entry) => {
              const packet = packages.find(
                (stored) => stored.packet.package_id === entry.packageId,
              )?.packet
              const student = packet?.students.find(
                (row) => row.student_id === entry.payload.student_id,
              )
              return (
                <li className={syncStyles.resultItem} key={entry.key}>
                  <header>
                    <strong>
                      {student
                        ? studentName(student)
                        : `Estudiante ${entry.payload.student_id}`}
                    </strong>
                    <span className={shared.badge} data-status={entry.status}>
                      {labels[entry.status]}
                    </span>
                  </header>
                  <p>{descriptions[entry.status]}</p>
                  {entry.result ? <p>{entry.result.message}</p> : null}
                  <p className={shared.muted}>
                    {entry.payload.method === 'MANUAL'
                      ? 'Manual'
                      : 'QR provisional'}{' '}
                    · {formatOfflineTime(entry.payload.captured_at)} · Hora
                    declarada por el dispositivo
                  </p>
                  <details>
                    <summary>Referencia del evento</summary>
                    <p>UUID: {entry.payload.event_id}</p>
                    <p>
                      Lista {entry.listId} · v{entry.version}
                    </p>
                    {entry.result ? (
                      <p>
                        Código: {entry.result.code}
                        {entry.result.entry_id !== null
                          ? ` · Ingreso oficial ${entry.result.entry_id}`
                          : ''}
                      </p>
                    ) : null}
                  </details>
                </li>
              )
            })}
          </ol>
        )}

        {visible.length > limit ? (
          <button
            className={buttons.secondaryButton}
            onClick={() => setLimit((value) => value + 25)}
          >
            Mostrar 25 más
          </button>
        ) : null}

        <p className={syncStyles.footerInfoNote}>
          <Info size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            Los conflictos y rechazos se conservan para seguimiento. Esta
            pantalla no resuelve ni convierte esos registros en ingresos
            aceptados.
          </span>
        </p>
      </div>
    </section>
  )
}