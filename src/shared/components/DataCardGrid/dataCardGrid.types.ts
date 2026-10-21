import type { ReactNode } from 'react'
import type {
  BaseTableEntity,
  TablePaginationMeta,
} from '@/shared/components/DataTable/dataTable.types'

/** Ámbito de ruta detectado automáticamente desde el navegador */
export type RouteModuleScope =
  | 'admin-users'
  | 'admin-students'
  | 'admin-teachers'
  | 'admin-general'
  | 'teacher-portal'
  | 'student-portal'
  | 'general'

/** Rol inferido según el prefijo de ruta activa */
export type RouteAccessRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GENERAL'

/** Información contextual de la ruta por la que se accedió al componente */
export interface RouteAccessContext {
  pathname: string
  accessRole: RouteAccessRole
  moduleScope: RouteModuleScope
  isAdminUsersRoute: boolean
  isAdminStudentsRoute: boolean
  isAdminTeachersRoute: boolean
  isTeacherRoute: boolean
  isStudentRoute: boolean
}

/** Definición declarativa de cada fila (Etiqueta | Valor) dentro de la tarjeta */
export interface CardFieldDef<T extends BaseTableEntity> {
  id: string
  label: string
  accessorKey?: keyof T
  cell?: (item: T, routeContext: RouteAccessContext) => ReactNode
  /** Si es true, ocupa todo el ancho del valor como bloque estirado (ej. badges de Grupo o Gestión) */
  fullWidthValue?: boolean
}

export type CardActionVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'outline'

/**
 * Definición extensible de una acción (Principio Open/Closed).
 * Permite agregar botones y filtrarlos por ruta sin tocar el código base de la tarjeta.
 */
export interface CardActionDef<T extends BaseTableEntity> {
  id: string
  label: string | ((item: T) => string)
  variant?: CardActionVariant | ((item: T) => CardActionVariant)
  icon?: ReactNode
  /** Si se especifica, la acción solo se mostrará cuando el usuario ingrese por estas rutas */
  allowedScopes?: readonly RouteModuleScope[]
  /** Si se especifica, la acción solo se mostrará para estos roles de ruta */
  allowedRoles?: readonly RouteAccessRole[]
  /** Condición dinámica adicional por ítem y ruta */
  isVisible?: (item: T, routeContext: RouteAccessContext) => boolean
  isDisabled?: (item: T, routeContext: RouteAccessContext) => boolean
  onClick: (item: T, routeContext: RouteAccessContext) => void
}

export interface DataCardItemProps<T extends BaseTableEntity> {
  item: T
  fields: readonly CardFieldDef<T>[]
  actions?: readonly CardActionDef<T>[]
  renderCustomActions?: (
    item: T,
    routeContext: RouteAccessContext,
  ) => ReactNode
  routeContext: RouteAccessContext
  labelWidth?: string
}

export interface DataCardGridProps<T extends BaseTableEntity> {
  fields: readonly CardFieldDef<T>[]
  data: readonly T[]
  loading: boolean
  error?: string | null
  /** Si no se pasa pagination externa, el componente pagina automáticamente de 10 en 10 (2x5) */
  pagination?: TablePaginationMeta | null
  /** Por defecto 10 para mantener exactamente 2 columnas x 5 filas */
  pageSize?: number
  /** Ancho de la columna izquierda de etiquetas (por defecto '96px') */
  labelWidth?: string
  entityLabel?: string
  searchPlaceholder?: string
  initialSearch?: string
  onSearch?: (query: string) => void
  onPageChange?: (newPage: number) => void
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  /** Lista extensible de acciones por tarjeta */
  actions?: readonly CardActionDef<T>[]
  /** Renderizador libre por si se requiere inyectar un componente complejo (ej. Dropdown) */
  renderCustomActions?: (
    item: T,
    routeContext: RouteAccessContext,
  ) => ReactNode
  /** Permite forzar un scope si se desea sobreescribir la autodetección de URL */
  forcedModuleScope?: RouteModuleScope
}