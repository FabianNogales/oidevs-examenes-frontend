import { useCallback, useId, useRef, useState } from 'react'
import { PortalHistory } from '@/features/portal-shared/components/PortalHistory'
import { AdminStatusBadge } from '@/features/portal-shared/components/AdminStatusBadge'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import {
  PortalAdminCollection,
  type PortalRow,
} from '@/features/portal-shared/components/PortalAdminCollection'
import { PortalFeedback, PortalModal } from '@/features/portal-shared/components/PortalUi'
import { usePortalResource } from '@/features/portal-shared/hooks/usePortalResource'
import type { PortalQuery } from '@/features/portal-shared/api/portalApi'
import { getInformationContent, listInformation } from '@/features/portal-information/api/informationApi'
import { InformationEditor } from '@/features/portal-information/components/InformationEditor'
import type { AdminInformation, InformationKind } from '@/features/portal-information/types/information.types'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { Dropdown } from '@/shared/components/ui/Dropdown/Dropdown'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import adminStyles from './adminInformation.module.css'

const columns: readonly TableColumnDef<PortalRow<AdminInformation>>[] = [
  {
    id: 'title',
    header: 'Contenido',
    cell: ({ item }) =>
      'title' in item.draft ? item.draft.title : item.draft.question,
  },
  {
    id: 'visible',
    header: 'Visibilidad',
    cell: ({ item }) => (
      <AdminStatusBadge
        status={item.is_published ? 'PUBLISHED' : 'UNPUBLISHED'}
      />
    ),
  },
  {
    id: 'changes',
    header: 'Borrador guardado',
    cell: ({ item }) =>
      item.has_unpublished_changes ? (
        <AdminStatusBadge status="PENDING_CHANGES" />
      ) : (
        'Sin cambios pendientes'
      ),
  },
]

function UnsavedInformationDialog({
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

function InformationDialog({
  kind,
  id,
  onClose,
  onSaved,
}: {
  kind: InformationKind
  id: number | null
  onClose: () => void
  onSaved: (item: AdminInformation) => void
}) {
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [editorState, setEditorState] = useState({
    label: id === null ? 'Crear FAQ' : 'Guardar borrador',
    disabled: true,
  })
  const [historyVersion, setHistoryVersion] = useState(0)
  const initialId = useRef(id).current
  const formId = useId()
  const requestClose = () => {
    if (busy) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }
  const load = useCallback(
    (signal: AbortSignal) =>
      initialId === null
        ? Promise.resolve(null)
        : getInformationContent(kind, initialId, signal),
    [kind, initialId],
  )
  const result = usePortalResource(load)
  return (
    <>
      <PortalModal
        drawer
        title={kind === 'sections' ? 'Gestionar sección' : 'Gestionar FAQ'}
        onClose={requestClose}
        busy={busy}
        closeBlocked={confirmClose}
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
            resource={`information/${kind}`}
            id={id}
          />
        ) : null}
        <PortalFeedback {...result} retry={result.reload} />
        {!result.loading && !result.error ? (
          <InformationEditor
            kind={kind}
            initial={result.data}
            onBusy={setBusy}
            onSaved={(item) => {
              setHistoryVersion((current) => current + 1)
              onSaved(item)
            }}
            onDirty={setDirty}
            onStateChange={setEditorState}
            formId={formId}
          />
        ) : null}
        <UnsavedInformationDialog
          open={confirmClose}
          onContinue={() => setConfirmClose(false)}
          onDiscard={onClose}
        />
      </PortalModal>
    </>
  )
}

export function AdminInformationPage() {
  const { notify } = useAuth()
  const [kind, setKind] = useState<InformationKind>('sections')
  const [published, setPublished] = useState('')
  const visibilitySelect = useRef<HTMLElement>(null)
  const [version, setVersion] = useState(0)
  const [selected, setSelected] = useState<{
    kind: InformationKind
    id: number | null
    dialogKey: string
  } | null>(null)
  const load = useCallback(
    (query: PortalQuery, signal: AbortSignal) =>
      listInformation(
        kind,
        {
          ...query,
          ...(published !== ''
            ? { is_published: Number(published) as 0 | 1 }
            : {}),
        },
        signal,
      ),
    [kind, published],
  )
  return (
    <PageContainer>
      <PortalAdminCollection
        headerVariant="page"
        resetPageKey={`${kind}-${published}`}
        title="Gestión de información y FAQ"
        description="Administra las secciones institucionales y las preguntas frecuentes del portal."
        className={`${styles.informationAdminPage} ${adminStyles.pageReset}`}
        searchLayout="wide"
        searchPlaceholder="Buscar información"
        createLabel="Crear pregunta frecuente"
        filterLayout="below"
        columns={columns}
        version={version}
        load={load}
        onSelect={(id) => setSelected({ kind, id, dialogKey: `${kind}-${id}` })}
        onCreate={
          kind === 'faqs'
            ? () => setSelected({ kind, id: null, dialogKey: `${kind}-new` })
            : undefined
        }
        filters={
          <>
            <label className={styles.field}>
              Tipo de contenido
              <Dropdown
                value={kind}
                options={[
                  { value: 'sections', label: 'Secciones institucionales' },
                  { value: 'faqs', label: 'Preguntas frecuentes' },
                ]}
                onChange={(nextValue) =>
                  setKind(nextValue as InformationKind)
                }
              />
            </label>
            <label className={styles.field}>
              Visibilidad
              <Dropdown
                triggerRef={visibilitySelect}
                value={published}
                options={[
                  { value: '', label: 'Todas' },
                  { value: '1', label: 'Publicado' },
                  { value: '0', label: 'Despublicado' },
                ]}
                onChange={(nextValue) => setPublished(nextValue)}
              />
            </label>
            {/* "Tipo de contenido" is the view selector, not a filter: only
                Visibilidad is cleared, and the search keeps DataTable's "Limpiar". */}
            {published !== '' ? (
              <button
                type="button"
                className={adminStyles.clearFilters}
                onClick={() => {
                  setPublished('')
                  // The button disappears: keep focus on the reset filter.
                  visibilitySelect.current?.focus()
                }}
              >
                Limpiar filtros
              </button>
            ) : null}
          </>
        }
      >
        {kind === 'sections' ? (
          <p className={styles.informationSectionNote}>
            Consulta las secciones existentes. Guardar un borrador no publica
            sus cambios.
          </p>
        ) : null}
      </PortalAdminCollection>
      {selected ? (
        <InformationDialog
          key={selected.dialogKey}
          kind={selected.kind}
          id={selected.id}
          onClose={() => setSelected(null)}
          onSaved={(item) => {
            setSelected((current) =>
              current ? { ...current, id: item.id } : current,
            )
            setVersion((current) => current + 1)
            notify('success', 'El contenido fue guardado.')
          }}
        />
      ) : null}
    </PageContainer>
  )
}
