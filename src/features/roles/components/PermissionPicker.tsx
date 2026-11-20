import type { RolePermission } from '../api/rolesApi'
import { Checkbox } from '@/shared/components/ui/Checkbox/Checkbox'
import styles from './RoleManagement.module.css'

export function PermissionPicker({ permissions, selected, disabled, onChange }: {
  permissions: RolePermission[]
  selected: string[]
  disabled: boolean
  onChange: (keys: string[]) => void
}) {
  const modules = [...new Set(permissions.map((permission) => permission.module))]
  return <>
    {!permissions.length && <p>No hay permisos configurables disponibles.</p>}
    {modules.map((module) => (
      <fieldset key={module} className={styles.permissions} disabled={disabled}>
        <legend>{module}</legend>
        {permissions.filter((permission) => permission.module === module).map((permission) => (
          <Checkbox key={permission.key} className={styles.permission} checked={selected.includes(permission.key)}
              disabled={disabled || !permission.is_configurable} label={permission.label}
              description={<>{permission.description}<br />{permission.is_enabled ? 'Habilitado para uso' : 'Configurable · Pendiente de habilitación'}</>}
              onChange={(event) => onChange(event.target.checked
                ? [...selected, permission.key] : selected.filter((key) => key !== permission.key))} />
        ))}
      </fieldset>
    ))}
  </>
}
