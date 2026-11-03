import { useCallback, useState } from 'react'
import { PortalHistory } from '@/features/portal-shared/PortalHistory'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import {
  PortalAdminCollection,
  type PortalRow,
} from '@/features/portal-shared/PortalAdminCollection'
import { PortalFeedback, PortalModal } from '@/features/portal-shared/PortalUi'
import { usePortalResource } from '@/features/portal-shared/usePortalResource'
import type { PortalQuery } from '@/features/portal-shared/portalApi'
import { getInformationContent, listInformation } from './informationApi'
import { InformationEditor } from './InformationEditor'
import type { AdminInformation, InformationKind } from './types'
import styles from '@/features/portal-shared/portalShared.module.css'

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
    cell: ({ item }) => (item.is_published ? 'Publicado' : 'Despublicado'),
  },
  {
    id: 'changes',
    header: 'Borrador guardado',
    cell: ({ item }) =>
      item.has_unpublished_changes
        ? 'Cambios pendientes'
        : 'Sin cambios pendientes',
  },
]
function InformationDialog({
  kind,
  id,
  onClose,
  onSaved,
}: {
  kind: InformationKind
  id: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const load = useCallback(
    (signal: AbortSignal) =>
      id === null
        ? Promise.resolve(null)
        : getInformationContent(kind, id, signal),
    [kind, id],
  )
  const result = usePortalResource(load)
  return (
    <PortalModal
      title={kind === 'sections' ? 'Gestionar sección' : 'Gestionar FAQ'}
      onClose={onClose}
      busy={busy}
    >
      {id !== null ? (
        <PortalHistory resource={`information/${kind}`} id={id} />
      ) : null}
      <PortalFeedback {...result} retry={result.reload} />
      {!result.loading && !result.error ? (
        <InformationEditor
          kind={kind}
          initial={result.data}
          onBusy={setBusy}
          onSaved={onSaved}
        />
      ) : null}
    </PortalModal>
  )
}

export function AdminInformationPage() {
  const { notify } = useAuth()
  const [kind, setKind] = useState<InformationKind>('sections')
  const [published, setPublished] = useState('')
  const [version, setVersion] = useState(0)
  const [selected, setSelected] = useState<{
    kind: InformationKind
    id: number | null
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
    <>
      <PortalAdminCollection
        key={`${kind}-${published}`}
        title="Gestión de información y FAQ"
        columns={columns}
        version={version}
        load={load}
        onSelect={(id) => setSelected({ kind, id })}
        onCreate={
          kind === 'faqs' ? () => setSelected({ kind, id: null }) : undefined
        }
      >
        <div className={styles.filters}>
          <label className={styles.field}>
            Tipo de contenido
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as InformationKind)
              }
            >
              <option value="sections">Secciones institucionales</option>
              <option value="faqs">Preguntas frecuentes</option>
            </select>
          </label>
          <label className={styles.field}>
            Visibilidad
            <select
              value={published}
              onChange={(event) => setPublished(event.target.value)}
            >
              <option value="">Todas</option>
              <option value="1">Publicado</option>
              <option value="0">Despublicado</option>
            </select>
          </label>
        </div>
        {kind === 'sections' ? (
          <p>
            Consulta las secciones existentes. Guardar un borrador no publica
            sus cambios.
          </p>
        ) : null}
      </PortalAdminCollection>
      {selected ? (
        <InformationDialog
          key={`${selected.kind}-${selected.id ?? 'new'}`}
          {...selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setVersion((current) => current + 1)
            notify('success', 'El contenido fue guardado.')
          }}
        />
      ) : null}
    </>
  )
}
