// Design System Global UI Barrel — Flat Design 2.0 (Semi-Flat)
// Pure, tree-shakeable re-exports of atoms, molecules, organisms, templates, and utilities.

// Atoms
export * from './Button'
export * from './Input'
export * from './Label'
export * from './Icon'
export * from './Badge'
export * from './Avatar'
export * from './Spinner'
export * from './Checkbox'
export * from './Radio'
export * from './Switch'
export * from './Select'
export * from './Typography'

// Molecules
export * from './FormField'
export * from './SearchBar'
export * from './Card'
export * from './Dropdown'
export * from './Tabs'
export * from './Accordion'
export * from './Breadcrumb'
export * from './Pagination'
export * from './Tooltip'

// Organisms
export * from './Sidebar'
export * from './Modal'
export * from './Toast'
export * from './Table'

// Templates / Layout
export * from './Layout'
export * from './PageContainer'
export * from './PageHeader'

// Global Utilities & States
export * from './States'
export * from './ThemeProvider'
export {
  useId,
  useControllableState,
  useMediaQuery,
  useClickOutside,
  useDebounce,
  type UseControllableStateOptions,
} from '@/shared/hooks'
