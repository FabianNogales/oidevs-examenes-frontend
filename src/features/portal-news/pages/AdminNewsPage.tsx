import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { Dropdown } from '@/shared/components/ui/Dropdown/Dropdown'
import { useCallback, useId, useState } from 'react'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'
import { AdminStatusBadge } from '@/features/portal-shared/components/AdminStatusBadge'
import { PortalHistory } from '@/features/portal-shared/components/PortalHistory'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import {
  PortalAdminCollection,
  type PortalRow,
} from '@/features/portal-shared/components/PortalAdminCollection'
import { PortalFeedback, PortalModal } from '@/features/portal-shared/components/PortalUi'
import {
  publicationDate,
  type PortalQuery,
} from '@/features/portal-shared/api/portalApi'
import { usePortalResource } from '@/features/portal-shared/hooks/usePortalResource'
import { getAdminNews, listAdminNews } from '../api/newsApi'
import {
  NEWS_STATUS_LABELS,
  type AdminNews,
  type AdminNewsSummary,
  type NewsStatus,
} from '../types/news.types'
import { NewsEditor } from '../components/NewsEditor'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import adminStyles from './adminNews.module.css'

const columns: readonly TableColumnDef<PortalRow<AdminNewsSummary>>[] = [
  {
    id: 'title',
    header: 'Título',
    width: '46%',
    cell: ({ item }) => item.title,
  },
  {
    id: 'state',
    header: 'Estado',
    width: '18%',
    cell: ({ item }) => (
      <span>
        <AdminStatusBadge status={item.status} />
      </span>
    ),
  },
  {
    id: 'date',
    header: 'Publicación',
    width: '20%',
    cell: ({ item }) => publicationDate(item.published_at),
  },
]

function UnsavedNewsDialog({
  open,
  onContinue,
  onDiscard,
}: {
  open: boolean
  onContinue: () => void
  onDiscard: () => void
}) {
  return (
    <ConfirmDialog
      native
      isOpen={open}
      title="¿Descartar los cambios?"
      message="La información que no hayas guardado se perderá."
      cancelLabel="Seguir editando"
      confirmLabel="Descartar cambios"
      variant="danger"
      onCancel={onContinue}
      onConfirm={onDiscard}
    />
  )
}

function NewsDialog({
  id,
  onClose,
  onSaved,
}: {
  id: number | null
  onClose: () => void
  onSaved: (news: AdminNews) => void
}) {
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [editorState, setEditorState] = useState({
    label: id === null ? 'Crear borrador' : 'Guardar noticia',
    disabled: true,
  })
  const [historyVersion, setHistoryVersion] = useState(0)
  const formId = useId()
  const requestClose = () => {
    if (busy) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }
  const load = useCallback(
    (signal: AbortSignal) =>
      id === null ? Promise.resolve(null) : getAdminNews(id, signal),
    [id],
  )
  const result = usePortalResource(load)
  return (
    <>
      <PortalModal
        drawer
        title={id === null ? 'Nueva noticia' : 'Gestionar noticia'}
        busy={busy}
        closeBlocked={confirmClose}
        onClose={requestClose}
        footer={
          <>
            <button type="button" disabled={busy} onClick={requestClose}>
              Cancelar
            </button>
            <button
              type="submit"
              form={formId}
              className={styles.primary}
              disabled={busy || editorState.disabled}
            >
              {editorState.label}
            </button>
          </>
        }
      >
        {id !== null ? (
          <PortalHistory
            key={`${id}-${historyVersion}`}
            resource="news"
            id={id}
          />
        ) : null}
        <PortalFeedback {...result} retry={result.reload} />
        {!result.loading && !result.error ? (
          <NewsEditor
            formId={formId}
            initial={result.data}
            onSaved={(news) => {
              setHistoryVersion((current) => current + 1)
              onSaved(news)
            }}
            onBusy={setBusy}
            onDirty={setDirty}
            onStateChange={setEditorState}
          />
        ) : null}
        <UnsavedNewsDialog
          open={confirmClose}
          onContinue={() => {
            setConfirmClose(false)
          }}
          onDiscard={() => {
            onClose()
          }}
        />
      </PortalModal>
    </>
  )
}

export function AdminNewsPage() {
  const { notify } = useAuth()
  const [status, setStatus] = useState('')
  const [version, setVersion] = useState(0)
  const [selected, setSelected] = useState<{ id: number | null } | null>(null)
  const load = useCallback(
    (query: PortalQuery, signal: AbortSignal) =>
      listAdminNews(
        { ...query, ...(status ? { status: status as NewsStatus } : {}) },
        signal,
      ),
    [status],
  )
  return (
    <PageContainer>
      <PortalAdminCollection
        resetPageKey={status}
        headerVariant="page"
        title="Gestión de noticias"
        description="Crea, publica y archiva las noticias del portal institucional."
        className={adminStyles.newsAdminPage}
        searchPlaceholder="Buscar noticias"
        columns={columns}
        load={load}
        version={version}
        onSelect={(id) => setSelected({ id })}
        onCreate={() => setSelected({ id: null })}
        createLabel="Crear noticia"
        viewActionLabel="Gestionar"
        filterLayout="inline"
        filters={
          <>
            <label className={`${styles.field} ${adminStyles.statusFilter}`}>
              Estado
              <Dropdown
                name="news_status"
                value={status}
                options={[
                  { value: '', label: 'Todos los estados' },
                  ...Object.entries(NEWS_STATUS_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
                onChange={(nextValue) => setStatus(nextValue)}
              />
            </label>
            {status ? (
              <button
                type="button"
                className={adminStyles.clearFilters}
                onClick={() => setStatus('')}
              >
                Limpiar filtros
              </button>
            ) : null}
          </>
        }
      />
      {selected ? (
        <NewsDialog
          key={selected.id ?? 'new'}
          id={selected.id}
          onClose={() => setSelected(null)}
          onSaved={(news) => {
            setSelected({ id: news.id })
            setVersion((current) => current + 1)
            notify('success', 'La noticia fue guardada.')
          }}
        />
      ) : null}
    </PageContainer>
  )
}
