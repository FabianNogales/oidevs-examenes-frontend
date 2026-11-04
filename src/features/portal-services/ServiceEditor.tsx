import { useEffect, useState } from 'react'
import { useRevisionEditor } from '@/features/portal-shared/useRevisionEditor'
import { EditorFeedback, PortalField } from '@/features/portal-shared/PortalUi'
import {
  createService,
  editService,
  getAdminService,
  setServiceStatus,
} from './servicesApi'
import type {
  AdminService,
  ServiceInput,
  ServiceStatus,
} from './types'
import styles from '@/features/portal-shared/portalShared.module.css'

type ServiceDraft = {
  name: string
  description: string
  url: string
  display_order: number
}

function formOf(item: AdminService | null): ServiceDraft {
  return {
    name: item?.name ?? '',
    description: item?.description ?? '',
    url: item?.url ?? '',
    display_order: item?.display_order ?? 0,
  }
}

function validationIssues(item: AdminService) {
  const issues = item.validation_issues
  if (!issues) return []
  if (Array.isArray(issues)) return issues
  const labels: Record<string, string> = {
    name: 'Nombre',
    description: 'Descripción',
    icon: 'Icono',
    url: 'URL institucional',
    display_order: 'Orden de presentación',
  }
  return Object.entries(issues).flatMap(([field, messages]) =>
    (Array.isArray(messages) ? messages : [messages]).map(
      (message) => `${labels[field] ?? field.replaceAll('_', ' ')}: ${message}`,
    ),
  )
}

export function ServiceEditor({
  initial,
  onSaved,
  onBusy,
}: {
  initial: AdminService | null
  onSaved: () => void
  onBusy: (busy: boolean) => void
}) {
  const editor = useRevisionEditor(initial)
  const [form, setForm] = useState(() => formOf(initial))
  const [pending, setPending] = useState<ServiceStatus | null>(null)
  const item = editor.snapshot
  useEffect(() => {
    onBusy(editor.busy)
  }, [editor.busy, onBusy])
  const reviewIssues = item ? validationIssues(item) : []
  const hasChanges =
    !item ||
    form.name !== item.name ||
    form.description !== item.description ||
    form.url !== item.url ||
    form.display_order !== item.display_order ||
    !item.icon
  const fields = editor.error?.fields ?? {}

  async function save() {
    const input: ServiceInput = { ...form, icon: 'link' }
    const changes: Partial<ServiceInput> = {}
    if (item) {
      if (input.name !== item.name) changes.name = input.name
      if (input.description !== item.description)
        changes.description = input.description
      if (!item.icon) changes.icon = 'link'
      if (input.url !== item.url) changes.url = input.url
      if (input.display_order !== item.display_order)
        changes.display_order = input.display_order
    }
    const result = await editor.mutate(() =>
      item
        ? editService(item.id, changes, item.revision)
        : createService(input),
    )
    if (result) {
      setForm(formOf(result))
      onSaved()
    }
  }

  async function changeStatus() {
    if (!item || !pending) return
    const result = await editor.mutate(() =>
      setServiceStatus(item.id, pending, item.revision),
    )
    if (result) {
      setPending(null)
      onSaved()
    }
  }

  async function refresh() {
    if (!item) return
    const current = await editor.refresh((signal) =>
      getAdminService(item.id, signal),
    )
    if (current) {
      setForm(formOf(current))
      setPending(null)
    }
  }

  return (
    <div className={`${styles.page} ${styles.serviceEditor}`}>
      {item ? (
        <p>
          Estado: {item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
        </p>
      ) : (
        <p>
          El servicio se creará inactivo. La activación es una operación
          explícita.
        </p>
      )}
      {item?.needs_review ? (
        <div className={styles.notice} role="alert">
          <strong>Este servicio migrado necesita revisión.</strong>
          {reviewIssues.length ? (
            <ul>
              {reviewIssues.map((issue, index) => (
                <li key={`${issue}-${index}`}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p>Revisa y guarda los datos institucionales del servicio.</p>
          )}
        </div>
      ) : null}
      {item?.status === 'ACTIVE' ? (
        <p className={styles.notice}>
          Los cambios pueden reflejarse en el catálogo público. La API valida
          las reglas vigentes al guardar.
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <fieldset
          className={`${styles.editorFields} ${styles.serviceFields}`}
          disabled={editor.locked || pending !== null}
        >
          <legend>Datos del servicio</legend>
          <PortalField label="Nombre" error={fields.name}>
            <input
              name="name"
              value={form.name}
              maxLength={200}
              required
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </PortalField>
          <PortalField label="Descripción" error={fields.description}>
            <textarea
              name="description"
              value={form.description}
              maxLength={2000}
              required
              rows={4}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </PortalField>
          <PortalField label="URL institucional" error={fields.url}>
            <input
              name="url"
              type="url"
              value={form.url}
              required
              maxLength={2048}
              onChange={(event) =>
                setForm({ ...form, url: event.target.value })
              }
            />
            <small>
              Solo se permiten enlaces HTTPS pertenecientes a dominios
              institucionales autorizados de la UMSS.
            </small>
          </PortalField>
          <PortalField
            label="Orden de presentación"
            error={fields.display_order}
          >
            <input
              name="display_order"
              type="number"
              min={0}
              max={100000}
              step={1}
              required
              value={form.display_order}
              onChange={(event) =>
                setForm({
                  ...form,
                  display_order: Number(event.target.value),
                })
              }
            />
          </PortalField>
        </fieldset>
        <div className={`${styles.editorActions} ${styles.serviceActions}`}>
          {pending ? (
            <section className={styles.serviceConfirmation}>
              <div className={styles.serviceConfirmationCopy}>
                <h3>
                  ¿{pending === 'ACTIVE' ? 'Activar' : 'Desactivar'} este
                  servicio?
                </h3>
                <p>
                  {pending === 'ACTIVE'
                    ? 'El servicio quedará disponible en el catálogo público.'
                    : 'El servicio dejará de mostrarse públicamente.'}
                </p>
              </div>
              <div className={styles.serviceConfirmationButtons}>
                <button
                  type="button"
                  disabled={editor.locked}
                  onClick={() => setPending(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={
                    pending === 'ACTIVE'
                      ? `${styles.publishAction} ${styles.saveDraft}`
                      : styles.unpublishAction
                  }
                  disabled={editor.locked}
                  onClick={() => void changeStatus()}
                >
                  Confirmar{' '}
                  {pending === 'ACTIVE' ? 'activación' : 'desactivación'}
                </button>
              </div>
            </section>
          ) : (
            <>
              <button
                type="submit"
                className={`${styles.primary} ${styles.saveDraft}`}
                disabled={editor.locked || !hasChanges}
              >
                {item?.status === 'ACTIVE'
                  ? 'Guardar cambios'
                  : item
                    ? 'Guardar servicio'
                    : 'Crear servicio inactivo'}
              </button>
              {item ? (
                <div className={styles.serviceStatusAction}>
                  <button
                    type="button"
                    className={
                      item.status === 'ACTIVE'
                        ? styles.unpublishAction
                        : styles.publishAction
                    }
                    disabled={editor.locked || pending !== null}
                    onClick={() =>
                      setPending(
                        item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                      )
                    }
                  >
                    {item.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </form>
      <EditorFeedback {...editor} onRefresh={() => void refresh()} />
    </div>
  )
}
