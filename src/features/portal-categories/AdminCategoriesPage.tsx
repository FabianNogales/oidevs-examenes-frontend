import { useCallback, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  PortalAdminCollection,
  type PortalRow,
} from '@/features/portal-shared/PortalAdminCollection'
import { PortalModal } from '@/features/portal-shared/PortalUi'
import type { PortalQuery } from '@/features/portal-shared/portalApi'
import { listManagedCategories } from './categoriesApi'
import { CategoryHistory } from './CategoryHistory'
import {
  CategoryEditor,
  CategoryStatusBadge,
  type CategoryEditorState,
  type CategorySaveKind,
} from './CategoryEditor'
import {
  CATEGORY_CATALOGS,
  type CategoryCatalog,
  type CategoryStateFilter,
  type ManagedCategory,
} from './types'
import styles from '@/features/portal-shared/portalShared.module.css'
import categoryStyles from './categories.module.css'

const columns: readonly TableColumnDef<PortalRow<ManagedCategory>>[] = [
  { id: 'name', header: 'Nombre', width: '60%', cell: ({ item }) => item.name },
  {
    id: 'state',
    header: 'Estado',
    width: '24%',
    cell: ({ item }) => (
      <span>
        <CategoryStatusBadge active={item.is_active} />
      </span>
    ),
  },
]

const SAVED_MESSAGES: Record<CategorySaveKind, string> = {
  created: 'La categoría fue creada.',
  renamed: 'La categoría fue actualizada.',
  activated: 'La categoría fue activada.',
  deactivated: 'La categoría fue desactivada.',
}

function CategoryDialog({
  catalog,
  category,
  onClose,
  onSaved,
}: {
  catalog: CategoryCatalog
  category: ManagedCategory | null
  onClose: () => void
  onSaved: (category: ManagedCategory, kind: CategorySaveKind) => void
}) {
  const formId = useId()
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  // Remount the history after each save so it shows the new audit entry.
  const [historyVersion, setHistoryVersion] = useState(0)
  const [editorState, setEditorState] = useState<CategoryEditorState>({
    label: category ? 'Guardar nombre' : 'Crear categoría',
    disabled: true,
    confirming: false,
  })
  const requestClose = () => {
    if (busy || editorState.confirming) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }
  return (
    <PortalModal
      drawer
      title={category ? 'Gestionar categoría' : 'Nueva categoría'}
      busy={busy}
      closeBlocked={confirmClose || editorState.confirming}
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
      {category ? (
        <CategoryHistory
          key={`${catalog}-${category.id}-${historyVersion}`}
          catalog={catalog}
          id={category.id}
        />
      ) : null}
      <CategoryEditor
        catalog={catalog}
        initial={category}
        formId={formId}
        onSaved={(saved, kind) => {
          setHistoryVersion((current) => current + 1)
          onSaved(saved, kind)
        }}
        onBusy={setBusy}
        onDirty={setDirty}
        onStateChange={setEditorState}
      />
      <ConfirmDialog
        native
        isOpen={confirmClose}
        title="¿Descartar los cambios?"
        message="La información que no hayas guardado se perderá."
        cancelLabel="Seguir editando"
        confirmLabel="Descartar cambios"
        variant="danger"
        onCancel={() => setConfirmClose(false)}
        onConfirm={onClose}
      />
    </PortalModal>
  )
}

export function AdminCategoriesPage({ catalog }: { catalog: CategoryCatalog }) {
  const config = CATEGORY_CATALOGS[catalog]
  const { notify } = useAuth()
  const [state, setState] = useState<CategoryStateFilter>('')
  const [version, setVersion] = useState(0)
  const [selected, setSelected] = useState<{
    category: ManagedCategory | null
  } | null>(null)
  // Rows of the last response, so "Gestionar" opens the exact listed resource
  // (the contract exposes no GET /{id}).
  const rows = useRef(new Map<number, ManagedCategory>())
  const load = useCallback(
    async (query: PortalQuery, signal: AbortSignal) => {
      const result = await listManagedCategories(
        catalog,
        { ...query, ...(state ? { is_active: state === 'active' } : {}) },
        signal,
      )
      rows.current = new Map(result.data.map((item) => [item.id, item]))
      return result
    },
    [catalog, state],
  )
  return (
    <>
      <PortalAdminCollection
        resetPageKey={state}
        title={config.title}
        description={config.description}
        searchPlaceholder="Buscar por nombre"
        columns={columns}
        load={load}
        version={version}
        onSelect={(id) => {
          const category = rows.current.get(id)
          if (category) setSelected({ category })
        }}
        onCreate={() => setSelected({ category: null })}
        createLabel="Crear categoría"
        viewActionLabel="Gestionar"
        filterLayout="inline"
        filters={
          <label className={`${styles.field} ${categoryStyles.stateFilter}`}>
            Estado
            <select
              name="category_state"
              value={state}
              onChange={(event) =>
                setState(event.target.value as CategoryStateFilter)
              }
            >
              <option value="">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </label>
        }
      >
        <p className={categoryStyles.backLink}>
          <Link to={config.backTo}>{config.backLabel}</Link>
        </p>
      </PortalAdminCollection>
      {selected ? (
        <CategoryDialog
          key={selected.category?.id ?? 'new'}
          catalog={catalog}
          category={selected.category}
          onClose={() => setSelected(null)}
          onSaved={(category, kind) => {
            // A new category reopens in edit mode with the backend resource.
            if (kind === 'created') setSelected({ category })
            setVersion((current) => current + 1)
            notify('success', SAVED_MESSAGES[kind])
          }}
        />
      ) : null}
    </>
  )
}

export function AdminEventCategoriesPage() {
  return <AdminCategoriesPage key="event" catalog="event" />
}

export function AdminNewsCategoriesPage() {
  return <AdminCategoriesPage key="news" catalog="news" />
}
