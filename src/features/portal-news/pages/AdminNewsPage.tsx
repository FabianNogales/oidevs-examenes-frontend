import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { useCallback, useId, useState } from 'react'
import { Link } from 'react-router'
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
import { getAdminNews, getNewsCategories, listAdminNews } from '../api/newsApi'
import {
  NEWS_STATUS_LABELS,
  type AdminNews,
  type AdminNewsSummary,
  type NewsStatus,
} from '../types/news.types'
import { NewsEditor, type NewsCategoryOptions } from '../components/NewsEditor'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import adminStyles from './adminNews.module.css'

// Named so it is stable across renders (usePortalResource reloads on identity).
function loadAdminNewsCategories(signal: AbortSignal) {
  return getNewsCategories(true, signal)
}

const columns: readonly TableColumnDef<PortalRow<AdminNewsSummary>>[] = [
  {
    id: 'title',
    header: 'Título',
    width: '38%',
    cell: ({ item }) => item.title,
  },
  {
    id: 'category',
    header: 'Categoría',
    width: '16%',
    // Historical news keep category null; they are listed, never hidden.
    cell: ({ item }) => item.category?.name ?? 'Sin categoría',
  },
  {
    id: 'state',
    header: 'Estado',
    width: '14%',
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
  categories,
  onClose,
  onSaved,
}: {
  id: number | null
  categories: NewsCategoryOptions
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
            categories={categories}
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
  const [category, setCategory] = useState('')
  const [version, setVersion] = useState(0)
  const [selected, setSelected] = useState<{ id: number | null } | null>(null)
  const categories = usePortalResource(loadAdminNewsCategories)
  const activeCategories = categories.data ?? []
  // The backend applies category_id before paginating.
  const load = useCallback(
    (query: PortalQuery, signal: AbortSignal) =>
      listAdminNews(
        {
          ...query,
          ...(status ? { status: status as NewsStatus } : {}),
          ...(category ? { category_id: Number(category) } : {}),
        },
        signal,
      ),
    [status, category],
  )
  return (
    <PageContainer>
      <PortalAdminCollection
        resetPageKey={category ? `${status}|${category}` : status}
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
            {activeCategories.length ? (
              <label className={`${styles.field} ${adminStyles.statusFilter}`}>
                Categoría
                <select
                  name="news_category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {activeCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {status || category ? (
              <button
                type="button"
                className={adminStyles.clearFilters}
                onClick={() => {
                  setStatus('')
                  setCategory('')
                }}
              >
                Limpiar filtros
              </button>
            ) : null}
          </>
        }
      >
        <p className={adminStyles.categoriesLink}>
          <Link to="/admin/portal/news/categories">Gestionar categorías</Link>
        </p>
      </PortalAdminCollection>
      {selected ? (
        <NewsDialog
          key={selected.id ?? 'new'}
          id={selected.id}
          categories={categories}
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
