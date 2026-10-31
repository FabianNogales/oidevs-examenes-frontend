import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { parseExamId } from '@/features/exams/api/examDetailsApi'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { OfflineAccessGate } from '../components/OfflineAccessGate'
import { OfflineExamSummary } from '../components/OfflineExamSummary'
import { OfflinePreparationPanel } from '../components/OfflinePreparationPanel'
import { OfflineCapturePanel } from '../components/OfflineCapturePanel'
import { OfflineSyncPanel } from '../components/OfflineSyncPanel'
import { useOfflinePackage } from '../hooks/useOfflinePackage'
import { useOfflinePreparation } from '../hooks/useOfflinePreparation'
import { useOfflineSync } from '../hooks/useOfflineSync'
import { useConnectivity, useLocalClock } from '../hooks/useConnectivity'
import type { OfflineIdentity } from '../services/offlineIdentity'
import styles from '../components/OfflineEntry.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

function OfflineWorkspace({
  examId,
  identity,
}: {
  examId: number
  identity: OfflineIdentity
}) {
  const { user, refreshUser } = useAuth()
  const online = useConnectivity()
  const now = useLocalClock()
  const data = useOfflinePackage(identity.ownerId, examId)
  const preparation = useOfflinePreparation(
    identity.ownerId,
    examId,
    data.reload,
  )
  const sync = useOfflineSync(identity.ownerId, examId, data.reload)
  const [params, setParams] = useSearchParams()
  const [checking, setChecking] = useState(false)
  const tab = ['control', 'sync'].includes(params.get('view') ?? '')
    ? params.get('view')
    : 'prepare'
  const canRequest =
    online && user?.id === identity.ownerId && !user.must_change_password
  const pending = data.entries.filter(
    (entry) => entry.status === 'PENDING',
  ).length
  return (
    <main className={styles.page}>
      <Breadcrumbs
        items={[
          { label: 'Mis listas locales', to: '/offline' },
          { label: 'Control sin conexión' },
        ]}
      />
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>EIDA · Lista exclusiva</p>
          <h1>
            {tab === 'prepare'
              ? 'Preparación del control sin conexión'
              : tab === 'control'
                ? 'Control de ingreso sin conexión'
                : 'Sincronización de ingresos'}
          </h1>
          <p>
            {data.stored?.packet.exam.name ?? `Examen ${examId}`} ·{' '}
            {identity.displayName}
          </p>
        </div>
        {canRequest ? (
          <Link className={styles.link} to={`/exams/${examId}/entry-control`}>
            Abrir control online
          </Link>
        ) : null}
      </header>
      {!canRequest && online ? (
        <div className={styles.notice}>
          <p>
            Los datos locales están disponibles. Verifica la sesión con Laravel
            para descargar o sincronizar.
          </p>
          <button
            className={buttons.secondaryButton}
            disabled={checking}
            onClick={() => {
              setChecking(true)
              void refreshUser().finally(() => setChecking(false))
            }}
          >
            {checking ? 'Verificando…' : 'Verificar sesión con el servidor'}
          </button>
        </div>
      ) : null}
      <nav
        className={styles.tabs}
        aria-label="Herramientas del control sin conexión"
      >
        {[
          ['prepare', 'Preparación'],
          ['control', 'Control local'],
          ['sync', `Sincronización${pending ? ` (${pending})` : ''}`],
        ].map(([value, label]) => (
          <Link
            key={value}
            to={`?view=${value}`}
            aria-current={tab === value ? 'page' : undefined}
            onClick={(event) => {
              if (sync.busy || preparation.busy) event.preventDefault()
              else {
                event.preventDefault()
                setParams({ view: value }, { replace: true })
              }
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
      {data.loading ? (
        <p role="status">Abriendo almacenamiento de esta cuenta…</p>
      ) : null}
      {data.error ? (
        <div className={styles.error} role="alert">
          <p>{data.error}</p>
          <button className={buttons.secondaryButton} onClick={data.reload}>
            Reintentar almacenamiento
          </button>
        </div>
      ) : null}
      {data.stored ? <OfflineExamSummary packet={data.stored.packet} /> : null}
      {tab === 'prepare' ? (
        <OfflinePreparationPanel
          ownerId={identity.ownerId}
          examId={examId}
          stored={data.stored}
          entries={data.entries}
          preparation={preparation}
          canRequest={Boolean(canRequest) && !data.loading && !data.error}
          online={online}
          now={now}
          syncing={sync.busy}
          onDeleted={data.reload}
        />
      ) : null}
      {tab === 'control' && data.stored && !data.error ? (
        <OfflineCapturePanel
          key={data.stored.packet.package_id}
          stored={data.stored}
          entries={data.entries}
          now={now}
          onSaved={data.reload}
        />
      ) : null}
      {tab === 'control' && !data.stored && !data.loading ? (
        <section className={`${styles.panel} ${styles.empty}`}>
          <h2>Primero descarga tu lista</h2>
          <p>
            No hay una lista disponible para trabajar sin conexión. Conéctate y
            descarga tu lista antes del examen.
          </p>
          <Link to="?view=prepare" className={styles.link}>
            Ir a preparación
          </Link>
        </section>
      ) : null}
      {tab === 'sync' ? (
        <OfflineSyncPanel
          entries={data.entries}
          packages={data.packages}
          sync={sync}
          canRequest={Boolean(canRequest) && !data.error}
        />
      ) : null}
    </main>
  )
}
export function OfflineEntryPage() {
  const { examId } = useParams()
  const id = parseExamId(examId)
  return (
    <OfflineAccessGate>
      {(identity) =>
        id === null ? (
          <main className={styles.page}>
            <p role="alert">El identificador del examen no es válido.</p>
          </main>
        ) : (
          <OfflineWorkspace
            key={`${identity.ownerId}:${identity.contextId}:${id}`}
            examId={id}
            identity={identity}
          />
        )
      }
    </OfflineAccessGate>
  )
}
