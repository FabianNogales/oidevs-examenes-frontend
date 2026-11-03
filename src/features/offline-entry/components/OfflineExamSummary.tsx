import { CalendarClock, Clock, MapPin, Users } from 'lucide-react'
import type { OfflinePackage } from '../types/offline.types'
import { formatOfflineTime } from '../utils/offlineRules'
import shared from './styles/OfflineShared.module.css'
import workspace from './styles/OfflineWorkspace.module.css'

export function OfflineExamSummary({ packet }: { packet: OfflinePackage }) {
  return (
    <section
      className={workspace.summaryPanel}
      aria-label="Examen y lista descargada"
    >
      <div className={shared.toolbar}>
        <div>
          <p className={shared.eyebrow}>{packet.exam.subject_name}</p>
          <h2>{packet.exam.name}</h2>
        </div>
        <span className={shared.badge}>
          Lista {packet.list_id} · v{packet.version}
        </span>
      </div>

      <dl className={workspace.summaryGrid}>
        <div className={workspace.summaryItem}>
          <MapPin
            size={18}
            strokeWidth={1.75}
            className={workspace.summaryItemIcon}
            aria-hidden="true"
          />
          <div>
            <dt>Ambiente</dt>
            <dd>
              {packet.exam.room?.code} · {packet.exam.room?.name}
            </dd>
          </div>
        </div>

        <div className={workspace.summaryItem}>
          <Users
            size={18}
            strokeWidth={1.75}
            className={workspace.summaryItemIcon}
            aria-hidden="true"
          />
          <div>
            <dt>Rango de apellidos</dt>
            <dd>
              {packet.surname_range.from === null
                ? 'Lista vacía'
                : `${packet.surname_range.from} — ${packet.surname_range.to}`}
            </dd>
          </div>
        </div>

        <div className={workspace.summaryItem}>
          <CalendarClock
            size={18}
            strokeWidth={1.75}
            className={workspace.summaryItemIcon}
            aria-hidden="true"
          />
          <div>
            <dt>Inicio · hora de Bolivia</dt>
            <dd>
              {formatOfflineTime(
                packet.exam.entry_opens_at ?? packet.prepared_at,
              )}
            </dd>
          </div>
        </div>

        <div className={workspace.summaryItem}>
          <Clock
            size={18}
            strokeWidth={1.75}
            className={workspace.summaryItemIcon}
            aria-hidden="true"
          />
          <div>
            <dt>Vigente hasta · hora de Bolivia</dt>
            <dd>{formatOfflineTime(packet.expires_at)}</dd>
          </div>
        </div>
      </dl>
    </section>
  )
}