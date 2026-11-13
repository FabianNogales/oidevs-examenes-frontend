// Design System Global UI Barrel — Flat Design 2.0 (Semi-Flat)
// Pure, tree-shakeable re-exports of atoms, molecules, organisms, templates, and utilities.

// Atoms
export * from './Button/index'
export * from './Input/index'
export * from './Label/index'
export * from './Icon/index'
export * from './Badge/index'
export * from './Avatar/index'
export * from './Spinner/index'
export * from './Checkbox/index'
export * from './Radio/index'
export * from './Switch/index'
export * from './Select/index'
export * from './Typography/index'

// Molecules
export * from './FormField/index'
export * from './SearchBar/index'
export * from './Card/index'
export * from './Dropdown/index'
export * from './Tabs/index'
export * from './Accordion/index'
export * from './Breadcrumb/index'
export * from './Pagination/index'
export * from './Tooltip/index'

// Organisms
export * from './Sidebar/index'
export * from './Modal/index'
export * from './Toast/index'
export * from './Table/index'

// Templates / Layout
export * from './Layout/index'
export * from './PageContainer/index'
export * from './PageHeader/index'

// Global Utilities & States
export * from './States/index'
export * from './ThemeProvider/index'
export {
  useId,
  useControllableState,
  useMediaQuery,
  useClickOutside,
  useDebounce,
  type UseControllableStateOptions,
} from '@/shared/hooks/index'
