import type { ComponentType, ReactNode, RefObject } from 'react'

export type DropdownValue = string | number

export type DropdownSize = 'md' | 'sm'

export type DropdownAlign = 'start' | 'end'

export type DropdownTone = 'default' | 'success' | 'warning' | 'danger' | 'accent'

export interface DropdownIconProps {
  className?: string
  size?: number | string
  'aria-hidden'?: boolean | 'true' | 'false'
}

export type DropdownIcon = ComponentType<DropdownIconProps> | ReactNode

export interface DropdownOption<TValue extends DropdownValue = string> {
  /** Valor único de la opción */
  value: TValue
  /** Texto principal visible de la opción (soporta textos largos con salto de línea) */
  label: string
  /** Texto secundario o descriptivo opcional debajo de la etiqueta */
  description?: string
  /** Etiqueta corta o metadato lateral opcional */
  badge?: string
  /** Icono opcional de lucide-react o nodo React */
  icon?: DropdownIcon
  /** Deshabilita la selección de esta opción específica */
  disabled?: boolean
  /** Nombre de grupo o sección opcional */
  group?: string
  /** Indica si la opción inicia una nueva sección con divisor superior */
  startsSection?: boolean
  /** Tono semántico opcional para estados (ej. Activo / Inactivo) */
  tone?: DropdownTone
}

export interface DropdownBaseProps<TValue extends DropdownValue = string> {
  /** Lista de opciones recibida antes de renderizar */
  options: readonly DropdownOption<TValue>[]
  /** Texto mostrado cuando no hay selección activa */
  placeholder?: string
  /** Texto mostrado cuando la lista de opciones está vacía */
  emptyText?: string
  /** Icono inicial opcional en el botón disparador (lucide-react) */
  leadingIcon?: DropdownIcon
  /** Habilita búsqueda rápida dentro del menú desplegable */
  searchable?: boolean
  /** Placeholder del buscador interno */
  searchPlaceholder?: string
  /** Permite limpiar la selección actual */
  clearable?: boolean
  /** Tamaño visual del control */
  size?: DropdownSize
  /** Alineación horizontal del panel desplegable */
  align?: DropdownAlign
  /** Tono semántico del disparador */
  tone?: DropdownTone
  /** ID del elemento interactivo para asociar con <label htmlFor> */
  id?: string
  /** Nombre del campo para formularios e integraciones */
  name?: string
  /** Estado deshabilitado */
  disabled?: boolean
  /** Campo obligatorio */
  required?: boolean
  /** Marca el control como inválido para accesibilidad */
  invalid?: boolean
  /** Clase CSS adicional para el contenedor raíz */
  className?: string
  /** Clase CSS adicional para el botón disparador */
  triggerClassName?: string
  /** Clase CSS adicional para el menú de opciones */
  menuClassName?: string
  /** Referencia opcional al elemento disparador para manejo de foco externo */
  triggerRef?: RefObject<HTMLElement | null>
  /** Atributos ARIA estándar */
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
}

export interface DropdownSingleProps<TValue extends DropdownValue = string>
  extends DropdownBaseProps<TValue> {
  /** Selección única (por defecto) */
  multiple?: false
  /** Valor seleccionado actualmente (modo controlado) */
  value?: TValue
  /** Valor inicial cuando se utiliza de forma no controlada */
  defaultValue?: TValue
  /** Callback al elegir una opción */
  onChange?: (value: TValue) => void
}

export interface DropdownMultipleProps<TValue extends DropdownValue = string>
  extends DropdownBaseProps<TValue> {
  /** Selección múltiple habilitada */
  multiple: true
  /** Lista de valores seleccionados actualmente (modo controlado) */
  value?: readonly TValue[]
  /** Valores iniciales cuando se utiliza de forma no controlada */
  defaultValue?: readonly TValue[]
  /** Callback al alternar una o varias opciones */
  onChange?: (values: TValue[]) => void
}

export type DropdownProps<TValue extends DropdownValue = string> =
  | DropdownSingleProps<TValue>
  | DropdownMultipleProps<TValue>
