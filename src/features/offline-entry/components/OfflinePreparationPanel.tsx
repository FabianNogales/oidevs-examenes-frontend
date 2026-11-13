import { AlertTriangle, CheckCircle2, CloudDownload, Database, Download,} from 'lucide-react'
import type { useOfflinePreparation } from '../hooks/useOfflinePreparation'
import type { LocalEntry, StoredPackage } from '../types/offline.types'
import { formatOfflineTime } from '../utils/offlineRules'
import { OfflineDataDeletion } from './OfflineDataDeletion'
import shared from './OfflineShared.module.css'
import prepStyles from './OfflinePreparationPanel.module.css'

export function OfflinePreparationPanel({
  ownerId,
  examId,
  stored,
  entries,
  preparation,
  canRequest,
  online,
  now,
  syncing,
  onDeleted,
}: {
  ownerId: number
  examId: number
  stored: StoredPackage | null
  entries: LocalEntry[]
  preparation: ReturnType<typeof useOfflinePreparation>
  canRequest: boolean
  online: boolean
  now: number
  syncing: boolean
  onDeleted: () => void
}) {
  const expired = stored !== null && now >= Date.parse(stored.packet.expires_at)
  const available =
    stored && !expired && !stored.staleReason && preparation.shell?.ready

  const label = preparation.busy
    ? 'Descargando y guardando lista…'
    : !stored
      ? 'Sin preparar'
      : stored.staleReason
        ? 'Lista desactualizada'
        : expired
          ? 'Paquete vencido'
          : available
            ? 'Lista disponible sin conexión'
            : 'Lista guardada · apertura offline por confirmar'

  return (
    <section
      className={shared.panel}
      aria-labelledby="offline-preparation-title"
    >
      <div className={prepStyles.panelHeaderRow}>
        <div>
          <p className={shared.eyebrow}>HU36 · Preparación del dispositivo</p>
          <h2 id="offline-preparation-title">
            Preparación del control sin conexión
          </h2>
          <p className={shared.panelSubtitle}>
            Descarga tu lista mientras tienes conexión. La persistencia de datos
            y los recursos de la aplicación se comprueban por separado.
          </p>
        </div>

        <p
          className={prepStyles.statusPill}
          data-ready={available ? 'true' : 'false'}
          role="status"
        >
          {label}
        </p>
      </div>

      <hr className={shared.sectionDivider} />

      <div className={prepStyles.preparationLayout}>
        <div className={prepStyles.preparationMainColumn}>
          {stored ? (
            <div className={prepStyles.preparedCard}>
              <dl className={shared.details}>
                <div>
                  <dt>Estudiantes asignados</dt>
                  <dd>{stored.packet.students.length}</dd>
                </div>
                <div>
                  <dt>Lista y versión</dt>
                  <dd>
                    {stored.packet.list_id} · v{stored.packet.version}
                  </dd>
                </div>
                <div>
                  <dt>Preparación del paquete</dt>
                  <dd>{formatOfflineTime(stored.packet.prepared_at)}</dd>
                </div>
                <div>
                  <dt>Guardado en el dispositivo</dt>
                  <dd>{formatOfflineTime(stored.savedAt)}</dd>
                </div>
              </dl>

              {!canRequest ? (
                <p className={shared.muted}>
                  {online
                    ? 'Verifica tu sesión con el servidor antes de descargar otra lista.'
                    : 'La descarga necesita conexión. La lista guardada puede consultarse localmente.'}
                </p>
              ) : null}

              <div className={shared.actions}>
                <button
                  type="button"
                  className={prepStyles.downloadPrimaryButton}
                  disabled={!canRequest || preparation.busy || syncing}
                  onClick={() => void preparation.download()}
                >
                  <Download size={16} strokeWidth={2} aria-hidden="true" />
                  <span>
                    {preparation.busy
                      ? 'Descargando…'
                      : 'Descargar una copia actualizada'}
                  </span>
                </button>

                <OfflineDataDeletion
                  ownerId={ownerId}
                  examId={examId}
                  entries={entries}
                  disabled={preparation.busy || syncing}
                  onDeleted={onDeleted}
                />
              </div>
            </div>
          ) : (
            <div className={prepStyles.emptyDownloadBox} role="status">
              <div className={prepStyles.emptyDownloadIcon} aria-hidden="true">
                <CloudDownload size={26} strokeWidth={1.65} />
              </div>

              <p className={prepStyles.emptyDownloadText}>
                No hay una lista disponible para trabajar sin conexión.
                Conéctate y descarga tu lista antes del examen.
              </p>

              {!canRequest ? (
                <p className={shared.muted}>
                  {online
                    ? 'Verifica tu sesión con el servidor antes de descargar otra lista.'
                    : 'La descarga necesita conexión. La lista guardada puede consultarse localmente.'}
                </p>
              ) : null}

              <button
                type="button"
                className={prepStyles.downloadPrimaryButton}
                disabled={!canRequest || preparation.busy || syncing}
                onClick={() => void preparation.download()}
              >
                <Download size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  {preparation.busy
                    ? 'Descargando…'
                    : 'Descargar lista para uso sin conexión'}
                </span>
              </button>
            </div>
          )}

          {stored?.staleReason ? (
            <p className={shared.error} role="alert">
              {stored.staleReason}
            </p>
          ) : null}

          {expired ? (
            <p className={shared.notice} data-warning="true">
              El paquete venció según el reloj local. Se conservan los eventos
              para envío y revisión; no se permiten nuevas capturas.
            </p>
          ) : null}

          {preparation.error ? (
            <p className={shared.error} role="alert">
              {preparation.error}
            </p>
          ) : null}
        </div>

        <aside className={prepStyles.preparationSideColumn}>
          {preparation.shell ? (
            <div
              className={prepStyles.shellAlertCard}
              data-warning={!preparation.shell.ready}
            >
              <div className={prepStyles.shellAlertHeader}>
                {preparation.shell.ready ? (
                  <CheckCircle2
                    size={16}
                    strokeWidth={1.85}
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    size={16}
                    strokeWidth={1.85}
                    aria-hidden="true"
                  />
                )}
                <strong>Apertura offline</strong>
              </div>
              <p>{preparation.shell.message}</p>
            </div>
          ) : (
            <div className={prepStyles.shellAlertCard} role="status">
              <div className={prepStyles.shellAlertHeader}>
                <AlertTriangle
                  size={16}
                  strokeWidth={1.85}
                  aria-hidden="true"
                />
                <strong>Apertura offline</strong>
              </div>
              <p>Comprobando recursos de la aplicación…</p>
            </div>
          )}

          <div className={prepStyles.persistenceNote}>
            <Database
              size={18}
              strokeWidth={1.75}
              className={prepStyles.persistenceNoteIcon}
              aria-hidden="true"
            />
            <p className={shared.muted}>
              Las descargas anteriores y sus eventos se conservan. Actualizar no
              cambia los UUID ni los paquetes usados por ingresos pendientes.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}