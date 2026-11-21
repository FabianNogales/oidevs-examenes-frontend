import { useId, type ComponentProps, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { useControllableState } from '@/shared/hooks/useControllableState'
import { Button } from '../Button/Button'
import styles from './SearchBar.module.css'

export const DEFAULT_SEARCH_MAX_LENGTH = 80

export interface SearchBarProps {
  /** Controlled search query value. */
  value?: string
  /** Initial search query when uncontrolled. */
  defaultValue?: string
  /** Fired whenever the input text changes. */
  onChange?: (nextValue: string) => void
  /**
   * Fired when the user submits the search form (Enter or clicking the submit button).
   * When omitted, SearchBar operates as a live/instant search bar without a submit button.
   */
  onSubmit?: (query: string) => void
  /** Optional callback fired when clearing the search query via the input clear control. */
  onClear?: () => void
  /** Accessible label and placeholder text. */
  placeholder?: string
  /** Accessible label for the search input (defaults to `placeholder`). */
  label?: string
  /** Renders `label` visibly above the search bar instead of visually hidden. */
  showLabel?: boolean
  /** Submit button text. */
  submitLabel?: string
  /** Accessible label for the inline clear control (used when `type="text"`). */
  clearLabel?: string
  /** Maximum character limit. Defaults to 80 (`DEFAULT_SEARCH_MAX_LENGTH`). */
  maxLength?: number
  /** Disables the input and buttons (e.g., while loading). */
  disabled?: boolean
  /** Disables only the submit button (e.g., when an empty query cannot be submitted). */
  submitDisabled?: boolean
  /** Shows loading state on the submit button. */
  loading?: boolean
  /** Kept for backwards compatibility; clearing is handled by the input's native `x`. */
  showClear?: boolean
  /** Hides the inline clear button when `type="text"`. */
  hideClear?: boolean
  /** Optional id for the search input. */
  id?: string
  /** Optional name attribute for the search input. */
  name?: string
  /** Input type (defaults to `'search'`). */
  type?: 'search' | 'text'
  inputMode?: ComponentProps<'input'>['inputMode']
  autoComplete?: string
  spellCheck?: boolean
  className?: string
}

/**
 * Global SearchBar molecule: single reusable search component across the app.
 * Enforces a default limit of 80 characters (when `maxLength` is not specified)
 * and renders a live remaining-character counter.
 * Uses the search input's built-in clear `x` control (no separate Clear button).
 */
export function SearchBar({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Buscar…',
  label,
  showLabel = false,
  submitLabel = 'Buscar',
  clearLabel = 'Limpiar',
  maxLength,
  disabled = false,
  submitDisabled = false,
  loading = false,
  hideClear = false,
  id: idProp,
  name,
  type = 'search',
  inputMode,
  autoComplete,
  spellCheck,
  className,
}: SearchBarProps) {
  const generatedId = useId()
  const inputId = idProp ?? `search-${generatedId}`
  const resolvedMaxLength = maxLength ?? DEFAULT_SEARCH_MAX_LENGTH
  const clampedValue =
    value !== undefined ? value.slice(0, resolvedMaxLength) : undefined
  const clampedDefault = defaultValue.slice(0, resolvedMaxLength)

  const [query, setQuery] = useControllableState<string>({
    value: clampedValue,
    defaultValue: clampedDefault,
    onChange,
  })

  const remaining = Math.max(0, resolvedMaxLength - query.length)
  const accessibleLabel = label ?? placeholder
  const isSubmitMode = typeof onSubmit === 'function'
  const showInlineClear = type !== 'search' && !hideClear && query.length > 0

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || loading || submitDisabled) return
    onSubmit?.(query.trim().slice(0, resolvedMaxLength))
  }

  function handleClear() {
    if (disabled || loading) return
    setQuery('')
    if (onClear) {
      onClear()
    } else {
      onSubmit?.('')
    }
  }

  function handleInputChange(nextRaw: string) {
    const next = nextRaw.slice(0, resolvedMaxLength)
    const wasNonEmpty = query.length > 0
    setQuery(next)
    if (wasNonEmpty && next === '') {
      if (onClear) {
        onClear()
      } else {
        onSubmit?.('')
      }
    }
  }

  const inputGroup = (
    <div
      className={[
        styles.inputGroup,
        disabled || loading ? styles.inputGroupDisabled : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!showLabel ? (
        <label htmlFor={inputId} className={styles.visuallyHidden}>
          {accessibleLabel}
        </label>
      ) : null}
      <Search className={styles.searchIcon} aria-hidden="true" />
      <input
        id={inputId}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        maxLength={resolvedMaxLength}
        value={query}
        placeholder={placeholder}
        aria-label={accessibleLabel}
        disabled={disabled || loading}
        className={styles.input}
        onChange={(event) =>
          handleInputChange((event.currentTarget ?? event.target).value)
        }
      />
      {showInlineClear ? (
        <button
          type="button"
          className={styles.inlineClearButton}
          disabled={disabled || loading}
          onClick={handleClear}
          aria-label={clearLabel}
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : null}
      <span
        className={[
          styles.counter,
          remaining === 0 ? styles.counterLimit : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-live="polite"
        aria-label={`${remaining} caracteres restantes`}
        title={`${remaining} caracteres restantes`}
      >
        {remaining} restantes
      </span>
    </div>
  )

  const visibleLabel =
    showLabel && label ? (
      <label htmlFor={inputId} className={styles.visibleLabel}>
        {label}
      </label>
    ) : null

  if (!isSubmitMode) {
    return (
      <div
        role="search"
        aria-label={accessibleLabel}
        className={[
          styles.wrapper,
          showLabel ? styles.withLabel : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {visibleLabel}
        <div className={styles.row}>{inputGroup}</div>
      </div>
    )
  }

  return (
    <form
      role="search"
      aria-label={accessibleLabel}
      className={[
        styles.form,
        showLabel ? styles.withLabel : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onSubmit={handleFormSubmit}
    >
      {visibleLabel}
      <div className={styles.row}>
        {inputGroup}

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            disabled={disabled || submitDisabled}
            loading={loading}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}
