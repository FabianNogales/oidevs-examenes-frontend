import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { Button } from '@/shared/components/ui/Button/Button'
import { ButtonLink } from '@/shared/components/ui/Button/ButtonLink'
import { Badge } from '@/shared/components/ui/Badge/Badge'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { getPermissions, getRole, getRoles, type ManagedRole, type RolePermission } from '../api/rolesApi'
import { RoleEditorDialog } from '../components/RoleEditorDialog'
import styles from '../components/RoleManagement.module.css'

const columns: readonly TableColumnDef<ManagedRole>[] = [
  { id: 'name', header: 'Rol', accessorKey: 'name' },
  { id: 'type', header: 'Tipo', cell: (role) => <Badge className={styles.cellBadge} tone={role.is_protected ? 'info' : 'accent'} size="sm">
    {role.is_protected ? 'Base protegido' : 'Personalizado'}</Badge> },
  { id: 'status', header: 'Estado', cell: (role) => <Badge className={styles.cellBadge} tone={role.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
    {role.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</Badge> },
  { id: 'permissions', header: 'Permisos configurados', cell: (role) => role.is_protected ? 'Reglas actuales del sistema' : role.permission_keys.length },
]

export function AdminRolesPage() {
  const { notify } = useAuth()
  const [roles, setRoles] = useState<ManagedRole[]>([])
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{ role: ManagedRole | null } | null>(null)
  const [opening, setOpening] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getRoles(controller.signal), getPermissions(controller.signal)]).then(([rows, catalog]) => {
      if (!controller.signal.aborted) { setRoles(rows); setPermissions(catalog); setError(null); setLoading(false) }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.'); setLoading(false) }
    })
    return () => controller.abort()
  }, [version])
  useEffect(() => () => request.current?.abort(), [])
  async function open(role: ManagedRole) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setOpening(true)
    try {
      const current = await getRole(role.id, controller.signal)
      if (!controller.signal.aborted) setSelected({ role: current })
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el rol.')
    } finally { if (!controller.signal.aborted) setOpening(false) }
  }
  return <PageContainer>
    <PageHeader title="Roles y permisos" description="Administra el catálogo de roles personalizados. Las asignaciones a cuentas se gestionan por separado."
      breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Roles y permisos' }]}
      actions={<div className={styles.toolbar}>
        <ButtonLink variant="secondary" to="/admin/users/assignments">Asignar o retirar roles de una cuenta</ButtonLink>
        <Button disabled={loading || opening || !!error} onClick={() => setSelected({ role: null })}>Crear rol personalizado</Button>
      </div>} />
    <p className={styles.notice}>Consulta, creación y edición se asignan por separado en los módulos habilitados. Carreras y Ofertas ofrecen solo consulta. Los periodos delegados se crean inactivos. Importación y cambios de estado siguen reservados al administrador.</p>
    {opening && <p role="status">Consultando el rol…</p>}
    <div className={styles.cardTable}>
      <DataTable searchMaxLength={50} columns={columns} data={roles.filter((role) => role.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))}
        loading={loading} error={error} entityLabel="roles" viewActionLabel="Ver rol"
        onSearch={setSearch} searchPlaceholder="Buscar por nombre del rol"
        onViewProfile={(role) => { if (!opening) void open(role) }}
        onRetry={() => { setLoading(true); setError(null); setVersion((value) => value + 1) }}
        emptyTitle="No se encontraron roles" emptyDescription="Prueba con otro nombre o crea un rol personalizado." />
    </div>
    {selected && <RoleEditorDialog role={selected.role} permissions={permissions} onClose={() => setSelected(null)}
      onSaved={() => { setSelected(null); setLoading(true); setVersion((value) => value + 1); notify('success', 'Rol guardado correctamente.') }} />}
  </PageContainer>
}
