import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Download, ExternalLink, FileText, RefreshCw, ScanLine,} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { parseExamId } from '@/features/exams/api/examDetailsApi'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
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
import shared from '../components/OfflineShared.module.css'
import workspace from '../components/OfflineWorkspace.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'
import pageStyles from './OfflinePages.module.css'

const titleId = 'offline-entry-title'

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
  const currentView = params.get('view') ?? ''
  const tab = ['control', 'sync'].includes(currentView)
    ? currentView
    : 'prepare'
  const canRequest =
    online && user?.id === identity.ownerId && !user.must_change_password
  const pending = data.entries.filter(
    (entry) => entry.status === 'PENDING',
  ).length
  const navigationTabs = [
    {
      value: 'prepare',
      step: '01',
      label: 'Preparación',
      Icon: Download,
    },
    {
      value: 'control',
      step: '02',
      label: 'Control local',
      Icon: ScanLine,
    },
    {
      value: 'sync',
      step: '03',
      label: `Sincronización${pending ? ` (${pending})` : ''}`,
      Icon: RefreshCw,
    },
  ] as const
  return (
    <main className={pageStyles.main}>
      <PageContainer labelledBy={titleId}>
      <PageHeader
        title={
          tab === 'prepare'
            ? 'Preparación del control sin conexión'
            : tab === 'control'
              ? 'Control de ingreso sin conexión'
              : 'Sincronización de ingresos'
        }
        titleId={titleId}
        eyebrow="EIDA · Lista exclusiva"
        breadcrumbs={[
          { label: 'Mis listas locales', to: '/offline' },
          { label: 'Control sin conexión' },
        ]}
        description={
          <span className={shared.headerSubtitle}>
            <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>
              {data.stored?.packet.exam.name ?? `Examen ${examId}`} ·{' '}
              {identity.displayName}
            </span>
          </span>
        }
        actions={
          canRequest ? (
            <Link
              className={workspace.onlineControlLink}
              to={`/exams/${examId}/entry-control`}
            >
              <span>Abrir control online</span>
              <ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          ) : null
        }
      />
      {!canRequest && online ? (
        <div className={shared.notice}>
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
        className={workspace.tabs}
        aria-label="Herramientas del control sin conexión"
      >
        {navigationTabs.map(({ value, step, label, Icon }) => {
          const isCurrent = tab === value
          return (
            <Link
              key={value}
              to={`?view=${value}`}
              className={workspace.tabItem}
              aria-current={isCurrent ? 'page' : undefined}
              onClick={(event) => {
                if (sync.busy || preparation.busy) {
                  event.preventDefault()
                } else {
                  event.preventDefault()
                  setParams({ view: value }, { replace: true })
                }
              }}
            >
              <span className={workspace.tabLeft}>
                <span className={workspace.tabNumber}>{step}</span>
                <span className={workspace.tabLabel}>{label}</span>
              </span>
              <Icon
                size={18}
                strokeWidth={1.75}
                className={workspace.tabIcon}
                aria-hidden="true"
              />
            </Link>
          )
        })}
      </nav>
      {data.loading ? (
        <p role="status">Abriendo almacenamiento de esta cuenta…</p>
      ) : null}
      {data.error ? (
        <div className={shared.error} role="alert">
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
        <section className={`${shared.panel} ${shared.empty}`}>
          <h2>Primero descarga tu lista</h2>
          <p>
            No hay una lista disponible para trabajar sin conexión. Conéctate y
            descarga tu lista antes del examen.
          </p>
          <Link to="?view=prepare" className={shared.link}>
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
      </PageContainer>
    </main>
  )
}

const invalidTitleId = 'offline-entry-invalid-title'
export function OfflineEntryPage() {
  const { examId } = useParams()
  const id = parseExamId(examId)
  return (
    <OfflineAccessGate>
      {(identity) =>
        id === null ? (
          <main className={pageStyles.main}>
            <PageContainer labelledBy={invalidTitleId}>
              <PageHeader
                title="Control de ingreso sin conexión"
                titleId={invalidTitleId}
              />
              <p role="alert">El identificador del examen no es válido.</p>
            </PageContainer>
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