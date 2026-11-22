import type { RolePermission } from '../api/rolesApi'
import { Checkbox } from '@/shared/components/ui/Checkbox/Checkbox'
import { Badge } from '@/shared/components/ui/Badge/Badge'
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
    {modules.map((module) => {
      const group = permissions.filter((permission) => permission.module === module)
      const count = group.filter((permission) => selected.includes(permission.key)).length
      return (
        <fieldset key={module} className={styles.permissions} disabled={disabled}>
          <legend className={styles.legend}>
            <span>{module}</span>
            <span className={styles.count}>{count} de {group.length} seleccionados</span>
          </legend>
          <div className={styles.permissionGrid}>
            {group.map((permission) => (
              <Checkbox key={permission.key} className={styles.permission} checked={selected.includes(permission.key)}
                  disabled={disabled || !permission.is_configurable} label={permission.label}
                  description={<span className={styles.permissionDescription}>
                    {permission.description}{' '}
                    {permission.is_enabled
                      ? <Badge className={styles.availability} tone="success" size="sm">Habilitado para uso</Badge>
                      : <Badge className={styles.availability} tone="warning" size="sm">Pendiente de habilitación</Badge>}
                  </span>}
                  onChange={(event) => onChange(event.target.checked
                    ? [...selected, permission.key] : selected.filter((key) => key !== permission.key))} />
            ))}
          </div>
        </fieldset>
      )
    })}
  </>
}
