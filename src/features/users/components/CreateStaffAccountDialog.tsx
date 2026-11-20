import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'
import { Button } from '@/shared/components/ui/Button/Button'
import { Field } from '@/shared/components/ui/Field/Field'
import { TextInput } from '@/shared/components/ui/Field/TextInput'
import { Select } from '@/shared/components/ui/Field/Select'
import { getRoles, ManagementError, type ManagedRole } from '@/features/roles/api/rolesApi'
import { createStaffAccount, type AdminUserItem } from '../api/adminUsersApi'
import styles from '@/features/roles/components/RoleManagement.module.css'

export function CreateStaffAccountDialog({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (account: AdminUserItem) => void
}) {
  const formId = useId()
  const [values, setValues] = useState({ first_names: '', last_names: '', identity_number: '', email: '', role_id: '' })
  const [roles, setRoles] = useState<ManagedRole[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState<ManagementError | null>(null)
  const [busy, setBusy] = useState(false)
  const [discard, setDiscard] = useState(false)
  const inFlight = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    getRoles(controller.signal).then((catalog) => {
      if (!controller.signal.aborted) { setRoles(catalog.filter((role) => role.is_custom && role.status === 'ACTIVE')); setLoading(false); setLoadError(null) }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) { setLoadError(cause instanceof Error ? cause.message : 'No se pudieron consultar los roles.'); setLoading(false) }
    })
    return () => controller.abort()
  }, [version])
  const dirty = Object.values(values).some(Boolean)
  function close() {
    if (inFlight.current) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || loading || loadError || !roles.some((role) => String(role.id) === values.role_id)) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try {
      const account = await createStaffAccount({ first_names: values.first_names.trim(), last_names: values.last_names.trim(),
        identity_number: values.identity_number.trim(), email: values.email.trim().toLowerCase(), role_id: Number(values.role_id) })
      onCreated(account)
    } catch (cause) { setError(cause instanceof ManagementError ? cause : new ManagementError('No se pudo crear la cuenta.')) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <>
    <PortalDialog title="Crear cuenta de personal" busy={busy} closeBlocked={discard} onClose={close}
      footer={<div className={styles.actions}>
        <Button variant="secondary" disabled={busy} onClick={close}>Cancelar</Button>
        <Button type="submit" form={formId} loading={busy} disabled={loading || !!loadError || !values.role_id || !roles.length}>
          {busy ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </div>}>
      <form id={formId} onSubmit={submit} className={styles.form}>
        <p className={styles.notice}>La cuenta iniciará sesión con su correo institucional y el CI como contraseña inicial.
          Deberá cambiarla en el primer acceso. Este alta no envía correos ni crea perfiles académicos.</p>
        {error && <p role="alert">{error.message}</p>}
        <div className={styles.fields}>
          {(['first_names', 'last_names', 'identity_number', 'email'] as const).map((key) => (
            <Field key={key} label={{ first_names: 'Nombres', last_names: 'Apellidos', identity_number: 'CI', email: 'Correo institucional' }[key]}
              required error={error?.fields[key]}>
              {(control) => <TextInput {...control} name={key} type={key === 'email' ? 'email' : 'text'} maxLength={255}
                inputMode={key === 'identity_number' ? 'numeric' : undefined} pattern={key === 'identity_number' ? '[0-9]+' : undefined}
                value={values[key]} disabled={busy} autoComplete="off"
                onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} />}
            </Field>
          ))}
        </div>
        {loading ? <p role="status">Consultando roles personalizados…</p> : loadError ? <div role="alert">
          <p>{loadError}</p><Button variant="secondary" onClick={() => { setLoading(true); setVersion((value) => value + 1) }}>Reintentar</Button>
        </div> : !roles.length ? <p>No hay roles personalizados activos. <Link to="/admin/users/roles">Crea un rol antes de dar de alta la cuenta.</Link></p> : (
          <Field label="Rol personalizado inicial" required error={error?.fields.role_id}
            hint="La cuenta tendrá únicamente las acciones habilitadas de los roles asignados.">
            {(control) => <Select {...control} name="role_id" value={values.role_id} disabled={busy}
              onChange={(event) => setValues((current) => ({ ...current, role_id: event.target.value }))}>
              <option value="">Selecciona un rol</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </Select>}
          </Field>
        )}
      </form>
    </PortalDialog>
    <ConfirmDialog native isOpen={discard} title="¿Descartar los datos?" message="La cuenta de personal no se creará."
      confirmLabel="Descartar" cancelLabel="Seguir completando" variant="danger"
      onConfirm={onClose} onCancel={() => setDiscard(false)} />
  </>
}
