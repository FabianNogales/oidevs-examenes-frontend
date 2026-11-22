import { useId, useRef, useState, type FormEvent } from 'react'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'
import { Field } from '@/shared/components/ui/Field/Field'
import { TextInput } from '@/shared/components/ui/Field/TextInput'
import { Button } from '@/shared/components/ui/Button/Button'
import { ManagementError, saveRole, type ManagedRole, type RolePermission } from '../api/rolesApi'
import { PermissionPicker } from './PermissionPicker'
import dialogBase from '@/shared/styles/dialogBase.module.css'
import styles from './RoleManagement.module.css'

export function RoleEditorDialog({ role, permissions, onClose, onSaved }: {
  role: ManagedRole | null
  permissions: RolePermission[]
  onClose: () => void
  onSaved: (role: ManagedRole) => void
}) {
  const formId = useId()
  const [name, setName] = useState(role?.name ?? '')
  const [keys, setKeys] = useState(role?.permission_keys ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ManagementError | null>(null)
  const [discard, setDiscard] = useState(false)
  const inFlight = useRef(false)
  const protectedRole = role?.is_protected ?? false
  const dirty = name.trim() !== (role?.name ?? '') || [...keys].sort().join('|') !== [...(role?.permission_keys ?? [])].sort().join('|')
  function close() {
    if (inFlight.current) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || protectedRole) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try { onSaved(await saveRole({ name: name.trim(), permission_keys: keys }, role)) }
    catch (cause) { setError(cause instanceof ManagementError ? cause : new ManagementError('No se pudo guardar el rol.')) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <>
    <PortalDialog title={protectedRole ? 'Rol base protegido' : role ? 'Editar rol personalizado' : 'Crear rol personalizado'}
      busy={busy} closeBlocked={discard} onClose={close}
      className={styles.editor} headerClassName={styles.editorHeader} bodyClassName={styles.editorBody}
      closeClassName={dialogBase.closeButton}
      footer={<div className={styles.actions}>
        <Button variant="secondary" disabled={busy} onClick={close}>{protectedRole ? 'Cerrar' : 'Cancelar'}</Button>
        {!protectedRole && <Button type="submit" form={formId} loading={busy} disabled={!name.trim() || !dirty}>
          {busy ? 'Guardando…' : role ? 'Guardar cambios' : 'Crear rol'}
        </Button>}
      </div>}>
      <form id={formId} className={styles.form} onSubmit={submit}>
        {error && <p role="alert">{error.message}</p>}
        <Field label="Nombre del rol" required error={error?.fields.name}>
          {(control) => <TextInput {...control} value={name} maxLength={100} disabled={busy || protectedRole}
            onChange={(event) => setName(event.target.value)} />}
        </Field>
        <p className={styles.notice}>{protectedRole
          ? 'Este rol conserva sus reglas actuales. Su nombre y sus privilegios no se editan desde este catálogo.'
          : 'Consultar, crear y editar son permisos independientes por módulo. Los cambios en un rol asignado revocan las sesiones anteriores de sus cuentas.'}</p>
        {!protectedRole && <>
          <PermissionPicker permissions={permissions} selected={keys} disabled={busy} onChange={setKeys} />
          {error?.fields.permission_keys && <p role="alert">{error.fields.permission_keys}</p>}
        </>}
      </form>
    </PortalDialog>
    <ConfirmDialog native isOpen={discard} title="¿Descartar los cambios?" message="Los cambios del rol no se guardarán."
      confirmLabel="Descartar" cancelLabel="Seguir editando" variant="danger"
      onConfirm={onClose} onCancel={() => setDiscard(false)} />
  </>
}
