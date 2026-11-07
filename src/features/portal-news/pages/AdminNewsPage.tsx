import { useCallback, useState } from 'react'
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

const columns: readonly TableColumnDef<PortalRow<AdminNewsSummary>>[] = [
  { id: 'title', header: 'Título', cell: ({ item }) => item.title },
  {
    id: 'state',
    header: 'Estado',
    cell: ({ item }) => NEWS_STATUS_LABELS[item.status],
  },
  {
    id: 'date',
    header: 'Publicación',
    cell: ({ item }) => publicationDate(item.published_at),
  },
]

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
  const [historyVersion, setHistoryVersion] = useState(0)
  const load = useCallback(
    (signal: AbortSignal) =>
      id === null ? Promise.resolve(null) : getAdminNews(id, signal),
    [id],
  )
  const result = usePortalResource(load)
  return (
    <PortalModal title="Gestionar noticia" busy={busy} onClose={onClose}>
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
          initial={result.data}
          onSaved={(news) => {
            setHistoryVersion((current) => current + 1)
            onSaved(news)
          }}
          onBusy={setBusy}
        />
      ) : null}
    </PortalModal>
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
    <>
      <PortalAdminCollection
        resetPageKey={status}
        title="Gestión de noticias"
        columns={columns}
        load={load}
        version={version}
        onSelect={(id) => setSelected({ id })}
        onCreate={() => setSelected({ id: null })}
      >
        <label className={styles.field}>
          Estado
          <select
            name="news_status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos los estados</option>
            {Object.entries(NEWS_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </PortalAdminCollection>
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
    </>
  )
}
