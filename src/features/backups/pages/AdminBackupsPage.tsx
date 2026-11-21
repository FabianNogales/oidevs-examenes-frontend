import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import { Badge } from '@/shared/components/ui/Badge/Badge'
import type { BadgeTone } from '@/shared/components/ui/Badge/Badge'
import { Button } from '@/shared/components/ui/Button/Button'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { Alert } from '@/shared/components/ui/Toast/Toast'
import {
  backupError,
  downloadBackup,
  listBackups,
  requestBackup,
} from '../api/backupsApi'
import type { Backup, BackupPage, BackupState } from '../api/backupsApi'
import {
  prepareBackupDownload,
  submitBackupDownload,
} from '../api/backupDownload'
import styles from './AdminBackupsPage.module.css'

const labels: Record<BackupState, string> = {
  QUEUED: 'En espera',
  RUNNING: 'Generando',
  UPLOADING: 'Subiendo',
  AVAILABLE: 'Disponible',
  FAILED: 'Fallido',
}
const tones: Record<BackupState, BadgeTone> = {
  QUEUED: 'neutral',
  RUNNING: 'info',
  UPLOADING: 'warning',
  AVAILABLE: 'success',
  FAILED: 'danger',
}
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })
    : '—'
const bytes = (value: number | null) =>
  value === null
    ? '—'
    : `${(value / 1_000_000).toLocaleString('es-BO', { maximumFractionDigits: 2 })} MB`

export function AdminBackupsPage() {
  const [query, setQuery] = useState({ page: 1, version: 0 })
  const key = `${query.page}:${query.version}`
  const [result, setResult] = useState<{
    key: string
    value: BackupPage | null
    error: string | null
  }>({ key: '', value: null, error: null })
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [notice, setNotice] = useState<{
    danger: boolean
    text: string
  } | null>(null)
  const mutation = useRef(false)
  const downloadLock = useRef(false)
  const mounted = useRef(true)
  const downloadFeedback = useRef<(() => void) | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      downloadFeedback.current?.()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let loading = false
    let failures = 0
    let active = false
    const visible = () => document.visibilityState !== 'hidden'
    async function load() {
      if (loading || controller.signal.aborted || !visible()) return
      loading = true
      if (timer) clearTimeout(timer)
      try {
        const value = await listBackups(query.page, controller.signal)
        if (controller.signal.aborted) return
        active = value.summary.active
        failures = 0
        setResult({ key, value, error: null })
      } catch (cause) {
        if (controller.signal.aborted) return
        failures += 1
        setResult((previous) => ({
          key,
          value: previous.key === key ? previous.value : null,
          error: backupError(cause),
        }))
        if (
          axios.isAxiosError(cause) &&
          [401, 403].includes(cause.response?.status ?? 0)
        )
          active = false
      } finally {
        loading = false
        if (!controller.signal.aborted && active && failures < 4 && visible()) {
          timer = setTimeout(() => void load(), failures ? 60_000 : 15_000)
        }
      }
    }
    const visibility = () => {
      if (timer) clearTimeout(timer)
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', visibility)
    void load()
    return () => {
      controller.abort()
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [key, query.page])

  const refresh = () =>
    setQuery((current) => ({ ...current, version: current.version + 1 }))
  const loading = result.key !== key
  const summary = result.key === key ? result.value?.summary : undefined

  async function generate() {
    if (mutation.current) return
    mutation.current = true
    setBusy(true)
    setNotice(null)
    try {
      const backup = await requestBackup()
      if (!mounted.current) return
      setNotice({
        danger: backup.state === 'FAILED',
        text: `Estado de la solicitud: ${labels[backup.state]}.`,
      })
      setConfirm(false)
      setQuery((current) => ({ page: 1, version: current.version + 1 }))
    } catch (cause) {
      if (!mounted.current) return
      setNotice({ danger: true, text: backupError(cause) })
      setConfirm(false)
      refresh()
    } finally {
      mutation.current = false
      if (mounted.current) setBusy(false)
    }
  }

  async function download(backup: Backup) {
    if (backup.state !== 'AVAILABLE' || downloadLock.current) return
    downloadLock.current = true
    setDownloading(backup.id)
    setNotice(null)
    let target: ReturnType<typeof prepareBackupDownload> | null = null
    try {
      target = prepareBackupDownload()
      const ticket = await downloadBackup(backup.id)
      if (!mounted.current) {
        target.popup.close()
        return
      }
      downloadFeedback.current?.()
      downloadFeedback.current = submitBackupDownload(
        ticket,
        target,
        (text) => {
          if (mounted.current) setNotice({ danger: true, text })
        },
      )
      setNotice({
        danger: false,
        text: 'La descarga se ha solicitado en otra ventana. Si no se inicia o la autorización caduca, pulsa Descargar nuevamente.',
      })
    } catch (cause) {
      target?.popup.close()
      if (mounted.current) setNotice({ danger: true, text: backupError(cause) })
    } finally {
      downloadLock.current = false
      if (mounted.current) setDownloading(null)
    }
  }

  const columns: readonly TableColumnDef<Backup>[] = [
    {
      id: 'date',
      header: 'Fecha y hora',
      cell: (row) => date(row.requested_at),
    },
    { id: 'requester', header: 'Administrador', accessorKey: 'requester' },
    {
      id: 'file',
      header: 'Archivo',
      cell: (row) => <span className={styles.filename}>{row.filename}</span>,
    },
    { id: 'bytes', header: 'Tamaño', cell: (row) => bytes(row.bytes) },
    { id: 'type', header: 'Tipo', cell: () => 'Manual completo' },
    {
      id: 'state',
      header: 'Estado',
      cell: (row) => (
        <div>
          <Badge tone={tones[row.state]}>{labels[row.state]}</Badge>
          {row.state === 'FAILED' && (
            <small className={styles.failure}>
              No se pudo generar el respaldo.
            </small>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: (row) =>
        row.state === 'AVAILABLE' ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={downloading !== null}
            loading={downloading === row.id}
            onClick={() => void download(row)}
            aria-label={`Descargar ${row.filename}`}
          >
            Descargar
          </Button>
        ) : (
          '—'
        ),
    },
  ]
  const meta = result.value?.meta

  return (
    <PageContainer
      title="Respaldos de base de datos"
      titleId="backups-title"
      description="Genera respaldos completos y consulta su historial. Las descargas están disponibles cuando finaliza la verificación."
      breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Respaldos' }]}
      actions={
        <>
          <Button
            variant="secondary"
            onClick={refresh}
            disabled={busy || loading}
          >
            Actualizar
          </Button>
          <Button
            id="generate-backup"
            onClick={() => setConfirm(true)}
            disabled={
              busy ||
              loading ||
              Boolean(result.error) ||
              !summary?.enabled ||
              summary.active
            }
          >
            Generar respaldo
          </Button>
        </>
      }
    >
      {notice && (
        <Alert
          tone={notice.danger ? 'danger' : 'info'}
          onClose={() => setNotice(null)}
        >
          {notice.text}
        </Alert>
      )}
      {summary && !summary.enabled && (
        <Alert tone="warning">
          El servicio de respaldos está pendiente de habilitación.
        </Alert>
      )}
      {summary?.active && (
        <Alert tone="info">
          Hay un respaldo en curso. El estado se actualiza cada 15 segundos
          mientras esta página esté visible.
        </Alert>
      )}
      <dl className={styles.summary} aria-label="Resumen de respaldos">
        <div>
          <dt>Cantidad de respaldos</dt>
          <dd>{summary?.total ?? '—'}</dd>
        </div>
        <div>
          <dt>Último respaldo disponible</dt>
          <dd>{date(summary?.last_available_at ?? null)}</dd>
        </div>
        <div>
          <dt>Espacio ocupado registrado</dt>
          <dd>{bytes(summary?.recorded_bytes ?? null)}</dd>
        </div>
      </dl>
      <DataTable<Backup>
        columns={columns}
        data={loading ? [] : (result.value?.data ?? [])}
        loading={loading}
        error={loading ? null : result.error}
        entityLabel="respaldos"
        onRetry={refresh}
        pagination={
          !loading && meta
            ? {
                currentPage: meta.current_page,
                lastPage: meta.last_page,
                total: meta.total,
                from: meta.from,
                to: meta.to,
              }
            : null
        }
        onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        emptyTitle="Todavía no hay respaldos"
        emptyDescription="Las solicitudes de respaldo aparecerán en este historial."
      />
      {confirm && (
        <PortalDialog
          title="Generar respaldo"
          busy={busy}
          onClose={() => {
            if (!busy) setConfirm(false)
          }}
          restoreFocusId="generate-backup"
          footer={
            <>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Cancelar
              </Button>
              <Button loading={busy} onClick={() => void generate()}>
                {busy ? 'Solicitando…' : 'Confirmar respaldo'}
              </Button>
            </>
          }
        >
          <p>
            Se generará un respaldo completo de la base de datos. La operación
            puede tardar varios minutos.
          </p>
          <p>
            Podrás consultar el avance y descargar el archivo cuando esté
            disponible.
          </p>
        </PortalDialog>
      )}
    </PageContainer>
  )
}
