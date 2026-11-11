import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'
import { AdminStatusBadge } from '@/features/portal-shared/components/AdminStatusBadge'
import { EditorFeedback, PortalField } from '@/features/portal-shared/components/PortalUi'
import { useRevisionEditor } from '@/features/portal-shared/hooks/useRevisionEditor'
import {
  createCategory,
  findManagedCategory,
  renameCategory,
  setCategoryStatus,
} from './categoriesApi'
import {
  CATEGORY_CATALOGS,
  CATEGORY_NAME_MAX,
  type CategoryCatalog,
  type ManagedCategory,
} from './types'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import categoryStyles from './categories.module.css'

export type CategorySaveKind = 'created' | 'renamed' | 'activated' | 'deactivated'
export type CategoryEditorState = {
  label: string
  disabled: boolean
  confirming: boolean
}

export function CategoryStatusBadge({ active }: { active: boolean }) {
  return (
    <AdminStatusBadge status={active ? 'ACTIVE' : 'INACTIVE'}>
      {active ? 'Activa' : 'Inactiva'}
    </AdminStatusBadge>
  )
}

export function CategoryEditor({
  catalog,
  initial,
  formId,
  onSaved,
  onBusy,
  onDirty,
  onStateChange,
}: {
  catalog: CategoryCatalog
  initial: ManagedCategory | null
  formId: string
  onSaved: (category: ManagedCategory, kind: CategorySaveKind) => void
  onBusy: (busy: boolean) => void
  onDirty?: (dirty: boolean) => void
  onStateChange?: (state: CategoryEditorState) => void
}) {
  const editor = useRevisionEditor(initial)
  const category = editor.snapshot
  const [name, setName] = useState(initial?.name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const feedback = useRef<HTMLDivElement>(null)
  const trimmed = name.trim()
  // Whitespace-only edits are not changes: the backend trims and treats them as no-op.
  const dirty = trimmed !== (category?.name ?? '')
  const locked = editor.locked || confirmDeactivate
  const submitLabel = category ? 'Guardar nombre' : 'Crear categoría'
  const submitDisabled = locked || (!!category && !dirty)
  useEffect(() => {
    onBusy(editor.busy)
  }, [editor.busy, onBusy])
  useEffect(() => {
    onDirty?.(dirty)
  }, [dirty, onDirty])
  useEffect(() => {
    onStateChange?.({
      label: submitLabel,
      disabled: submitDisabled,
      confirming: confirmDeactivate,
    })
  }, [submitLabel, submitDisabled, confirmDeactivate, onStateChange])
  useEffect(() => {
    if (editor.error) feedback.current?.focus()
  }, [editor.error])

  async function run(
    action: () => Promise<ManagedCategory>,
    kind: CategorySaveKind,
    resetName: boolean,
  ) {
    const result = await editor.mutate(action)
    if (!result) return
    if (resetName) setName(result.name)
    onSaved(result, kind)
  }
  function save() {
    if (submitDisabled) return
    if (!trimmed) {
      setNameError('El nombre es obligatorio.')
      return
    }
    if (trimmed.length > CATEGORY_NAME_MAX) {
      setNameError(`El nombre admite hasta ${CATEGORY_NAME_MAX} caracteres.`)
      return
    }
    setNameError(null)
    void run(
      () =>
        category
          ? renameCategory(catalog, category.id, trimmed, category.revision)
          : createCategory(catalog, trimmed),
      category ? 'renamed' : 'created',
      true,
    )
  }
  async function refresh() {
    if (!category) return
    const current = await editor.refresh((signal) =>
      findManagedCategory(catalog, category.id, signal),
    )
    if (current) {
      setName(current.name)
      setNameError(null)
    }
  }
  const fieldError = editor.error?.fields.name ?? nameError ?? undefined
  return (
    <div className={categoryStyles.editor} aria-busy={editor.busy}>
      {category ? (
        <section
          className={categoryStyles.statusPanel}
          aria-label="Estado de la categoría"
        >
          <p className={categoryStyles.statusRow}>
            <span>Estado:</span>
            <CategoryStatusBadge active={category.is_active} />
          </p>
          <p className={styles.muted}>
            {category.is_active
              ? 'Disponible para nuevas asignaciones.'
              : 'No se ofrece para nuevas asignaciones; los registros que ya la usan la conservan.'}
          </p>
          <div className={categoryStyles.actions}>
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                if (category.is_active) setConfirmDeactivate(true)
                else
                  void run(
                    () =>
                      setCategoryStatus(
                        catalog,
                        category.id,
                        true,
                        category.revision,
                      ),
                    'activated',
                    false,
                  )
              }}
            >
              {category.is_active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </section>
      ) : (
        <p className={styles.muted}>La categoría se creará como activa.</p>
      )}
      {editor.busy ? <p role="status">Procesando categoría…</p> : null}
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <fieldset className={styles.editorFields} disabled={locked}>
          <legend>Datos de la categoría</legend>
          <PortalField label="Nombre" error={fieldError}>
            <input
              name="name"
              value={name}
              maxLength={CATEGORY_NAME_MAX}
              required
              autoComplete="off"
              aria-invalid={!!fieldError}
              onChange={(event) => {
                setName(event.target.value)
                setNameError(null)
                editor.clearError()
              }}
            />
          </PortalField>
        </fieldset>
      </form>
      <div ref={feedback} tabIndex={-1}>
        <EditorFeedback {...editor} onRefresh={() => void refresh()} />
      </div>
      {category ? (
        <ConfirmDialog
          native
          isOpen={confirmDeactivate}
          title="¿Desactivar la categoría?"
          message={CATEGORY_CATALOGS[catalog].deactivateMessage}
          cancelLabel="Cancelar"
          confirmLabel="Desactivar"
          variant="danger"
          loading={editor.busy}
          onCancel={() => setConfirmDeactivate(false)}
          onConfirm={() => {
            setConfirmDeactivate(false)
            void run(
              () =>
                setCategoryStatus(catalog, category.id, false, category.revision),
              'deactivated',
              false,
            )
          }}
        />
      ) : null}
    </div>
  )
}
