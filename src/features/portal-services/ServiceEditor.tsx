import { useEffect, useState } from 'react'
import { useRevisionEditor } from '@/features/portal-shared/useRevisionEditor'
import { EditorFeedback, PortalField } from '@/features/portal-shared/PortalUi'
import {
  createService,
  editService,
  getAdminService,
  setServiceStatus,
} from './servicesApi'
import { ServiceIcon } from './ServiceCard'
import type {
  AdminService,
  DestinationType,
  ServiceCategory,
  ServiceInput,
  ServiceOptions,
  ServiceStatus,
} from './types'
import styles from '@/features/portal-shared/portalShared.module.css'

function formOf(item: AdminService | null) {
  return {
    name: item?.name ?? '',
    description: item?.description ?? '',
    category_id: item ? String(item.category.id) : '',
    icon_key: item?.icon_key ?? '',
    destination_type: item?.destination_type ?? '',
    destination: item?.destination ?? '',
    requires_auth: item?.requires_auth ?? false,
    sort_order: item?.sort_order ?? 0,
  }
}

export function ServiceEditor({
  initial,
  categories,
  options,
  onSaved,
  onBusy,
}: {
  initial: AdminService | null
  categories: ServiceCategory[]
  options: ServiceOptions
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
  const internal = options.internal_destinations.find(
    (option) => option.path === form.destination,
  )
  const validOptions =
    categories.some((category) => category.id === Number(form.category_id)) &&
    options.icon_keys.includes(form.icon_key) &&
    options.destination_types.includes(
      form.destination_type as DestinationType,
    ) &&
    (form.destination_type !== 'INTERNAL' || !!internal)
  const fields = editor.error?.fields ?? {}
  async function save() {
    if (!validOptions) return
    const input: ServiceInput = {
      ...form,
      category_id: Number(form.category_id),
      destination_type: form.destination_type as DestinationType,
    }
    const result = await editor.mutate(() =>
      item ? editService(item.id, input, item.revision) : createService(input),
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
    <div className={styles.page}>
      {item ? (
        <p>
          Estado: {item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'} · Revisión:{' '}
          {item.revision}
        </p>
      ) : (
        <p>
          El servicio se creará inactivo. La activación es una operación
          explícita.
        </p>
      )}
      {item?.status === 'ACTIVE' ? (
        <p className={styles.notice}>
          Guardar modifica la tarjeta pública. Desactiva primero para preparar
          cambios fuera del portal.
        </p>
      ) : null}
      {!categories.length ? (
        <p role="status">No hay categorías de servicios disponibles.</p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <fieldset
          className={styles.editorFields}
          disabled={
            editor.locked || pending !== null || (!item && !categories.length)
          }
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
          <PortalField label="Categoría" error={fields.category_id}>
            <select
              name="category_id"
              value={form.category_id}
              required
              onChange={(event) =>
                setForm({ ...form, category_id: event.target.value })
              }
            >
              <option value="">Selecciona una categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </PortalField>
          <PortalField label="Icono" error={fields.icon_key}>
            <select
              name="icon_key"
              value={form.icon_key}
              required
              onChange={(event) =>
                setForm({ ...form, icon_key: event.target.value })
              }
            >
              <option value="">Selecciona un icono</option>
              {options.icon_keys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </PortalField>
          {form.icon_key ? (
            <span className={styles.icon}>
              <ServiceIcon iconKey={form.icon_key} />
            </span>
          ) : null}
          <PortalField label="Tipo de destino" error={fields.destination_type}>
            <select
              name="destination_type"
              value={form.destination_type}
              required
              onChange={(event) =>
                setForm({
                  ...form,
                  destination_type: event.target.value,
                  destination: '',
                })
              }
            >
              <option value="">Selecciona un tipo de destino</option>
              {options.destination_types.map((type) => (
                <option
                  key={type}
                  value={type}
                  disabled={
                    type === 'INTERNAL' && !options.internal_destinations.length
                  }
                >
                  {type === 'INTERNAL' ? 'Interno' : 'Externo'}
                </option>
              ))}
            </select>
          </PortalField>
          {!options.internal_destinations.length ? (
            <p className={styles.muted}>
              No hay destinos internos disponibles. Requieren coordinación y
              configuración en backend.
            </p>
          ) : null}
          <PortalField
            label={
              form.destination_type === 'INTERNAL'
                ? 'Destino interno'
                : 'URL HTTPS'
            }
            error={fields.destination}
          >
            {form.destination_type === 'INTERNAL' ? (
              <select
                name="destination"
                value={form.destination}
                required
                onChange={(event) => {
                  const selected = options.internal_destinations.find(
                    (option) => option.path === event.target.value,
                  )
                  setForm({
                    ...form,
                    destination: event.target.value,
                    requires_auth:
                      !!selected?.requires_auth || form.requires_auth,
                  })
                }}
              >
                <option value="">Selecciona un destino autorizado</option>
                {options.internal_destinations.map((option) => (
                  <option key={option.path} value={option.path}>
                    {option.label} · {option.path}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="destination"
                type="url"
                value={form.destination}
                required
                maxLength={2048}
                disabled={form.destination_type !== 'EXTERNAL'}
                onChange={(event) =>
                  setForm({ ...form, destination: event.target.value })
                }
              />
            )}
          </PortalField>
          <PortalField
            label="Requiere iniciar sesión"
            error={fields.requires_auth}
          >
            <input
              name="requires_auth"
              type="checkbox"
              checked={form.requires_auth}
              disabled={
                form.destination_type === 'INTERNAL' &&
                !!internal?.requires_auth &&
                form.requires_auth
              }
              onChange={(event) =>
                setForm({ ...form, requires_auth: event.target.checked })
              }
            />
          </PortalField>
          {form.destination_type === 'INTERNAL' && internal?.requires_auth ? (
            <p>
              El destino elegido exige autenticación. Este requisito no concede
              permisos sobre el módulo.
            </p>
          ) : null}
          <PortalField label="Orden" error={fields.sort_order}>
            <input
              name="sort_order"
              type="number"
              min={0}
              max={100000}
              step={1}
              required
              value={form.sort_order}
              onChange={(event) =>
                setForm({ ...form, sort_order: Number(event.target.value) })
              }
            />
          </PortalField>
        </fieldset>
        <button
          type="submit"
          className={styles.primary}
          disabled={editor.locked || pending !== null || !validOptions}
        >
          {item ? 'Guardar servicio' : 'Crear servicio inactivo'}
        </button>
      </form>
      {item ? (
        <div className={styles.actions}>
          <button
            type="button"
            disabled={editor.locked || pending !== null}
            onClick={() =>
              setPending(item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
            }
          >
            {item.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ) : null}
      {pending ? (
        <section className={styles.notice}>
          <p>
            ¿{pending === 'ACTIVE' ? 'Activar' : 'Desactivar'} el servicio
            guardado?
          </p>
          <button
            type="button"
            disabled={editor.locked}
            onClick={() => setPending(null)}
          >
            Volver
          </button>
          <button
            type="button"
            disabled={editor.locked}
            onClick={() => void changeStatus()}
          >
            Confirmar operación
          </button>
        </section>
      ) : null}
      <EditorFeedback {...editor} onRefresh={() => void refresh()} />
    </div>
  )
}
