import { useId, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { useControllableState } from '@/shared/hooks/useControllableState'
import { Button } from '../Button/Button'
import { TextInput } from '../Field/TextInput'
import styles from './SearchBar.module.css'

export interface SearchBarProps {
  /** Controlled search query value. */
  value?: string
  /** Initial search query when uncontrolled. */
  defaultValue?: string
  /** Fired whenever the input text changes. */
  onChange?: (nextValue: string) => void
  /** Fired when the user submits the search form (Enter or clicking the submit button). */
  onSubmit: (query: string) => void
  /** Optional callback fired when clearing the search query. */
  onClear?: () => void
  /** Accessible label and placeholder text. */
  placeholder?: string
  /** Accessible label for the search input (defaults to `placeholder`). */
  label?: string
  /** Submit button text. */
  submitLabel?: string
  /** Clear button text. */
  clearLabel?: string
  /** Disables the input and buttons (e.g., while loading). */
  disabled?: boolean
  /** Shows loading state on the submit button. */
  loading?: boolean
  /** Optional id for the search input. */
  id?: string
  className?: string
}

/**
 * Global SearchBar molecule: combines TextInput + Button inside a semantic `<form role="search">`.
 * Agnostic of APIs: emits `onSubmit(query)` and supports controlled or uncontrolled state.
 */
export function SearchBar({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Buscar…',
  label,
  submitLabel = 'Buscar',
  clearLabel = 'Limpiar',
  disabled = false,
  loading = false,
  id: idProp,
  className,
}: SearchBarProps) {
  const generatedId = useId()
  const inputId = idProp ?? `search-${generatedId}`
  const [query, setQuery] = useControllableState<string>({
    value,
    defaultValue,
    onChange,
  })

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || loading) return
    onSubmit(query.trim())
  }

  function handleClear() {
    if (disabled || loading) return
    setQuery('')
    if (onClear) {
      onClear()
    } else {
      onSubmit('')
    }
  }

  return (
    <form
      role="search"
      aria-label={label ?? placeholder}
      className={[styles.form, className].filter(Boolean).join(' ')}
      onSubmit={handleFormSubmit}
    >
      <div className={styles.inputGroup}>
        <label htmlFor={inputId} className={styles.visuallyHidden}>
          {label ?? placeholder}
        </label>
        <Search className={styles.searchIcon} aria-hidden="true" />
        <TextInput
          id={inputId}
          type="search"
          value={query}
          placeholder={placeholder}
          disabled={disabled || loading}
          className={styles.input}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </div>

      <div className={styles.actions}>
        <Button
          type="submit"
          variant="primary"
          disabled={disabled}
          loading={loading}
        >
          {submitLabel}
        </Button>

        {query.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || loading}
            onClick={handleClear}
          >
            <X size={16} aria-hidden="true" />
            <span>{clearLabel}</span>
          </Button>
        ) : null}
      </div>
    </form>
  )
}
