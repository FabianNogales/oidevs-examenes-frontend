import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactElement,
} from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import type {
  DropdownIcon,
  DropdownIconProps,
  DropdownOption,
  DropdownProps,
  DropdownTone,
  DropdownValue,
} from './dropdown.types'
import {
  coerceSingleValue,
  createDropdownStaticNode,
  filterDropdownOptions,
  formatDropdownSummary,
  getFirstEnabledOptionIndex,
  getLastEnabledOptionIndex,
  getNextEnabledOptionIndex,
  getSelectedDropdownOptions,
  isOptionSelected,
  resolveInvalidFlag,
  toggleMultipleValue,
} from './dropdown.utils'
import styles from './Dropdown.module.css'

function isReactElementNode(value: unknown): value is ReactElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('props' in value || '$$typeof' in value) &&
    !('render' in value)
  )
}

function renderDropdownIcon(icon: DropdownIcon, className?: string) {
  if (!icon) return null
  if (isReactElementNode(icon)) return icon
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
    const IconComponent = icon as ComponentType<DropdownIconProps>
    return <IconComponent className={className} aria-hidden="true" />
  }
  return null
}

function getToneClass(tone?: DropdownTone): string | null {
  switch (tone) {
    case 'success':
      return styles.toneSuccess
    case 'warning':
      return styles.toneWarning
    case 'danger':
      return styles.toneDanger
    case 'accent':
      return styles.toneAccent
    default:
      return null
  }
}

function getOptionToneClass(tone?: DropdownTone): string | null {
  switch (tone) {
    case 'success':
      return styles.optionToneSuccess
    case 'danger':
      return styles.optionToneDanger
    default:
      return null
  }
}

export function Dropdown<TValue extends DropdownValue = string>(
  props: DropdownProps<TValue>,
) {
  const {
    options,
    placeholder = 'Selecciona una opción',
    emptyText = 'No hay opciones disponibles',
    leadingIcon,
    searchable = false,
    searchPlaceholder = 'Filtrar opciones…',
    clearable = false,
    size = 'md',
    align = 'start',
    tone = 'default',
    id,
    name,
    disabled = false,
    required = false,
    invalid = false,
    className,
    triggerClassName,
    menuClassName,
    triggerRef: externalTriggerRef,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
  } = props

  const isMultiple = props.multiple === true
  const generatedId = useId()
  const controlId = id ?? `dropdown-${generatedId}`
  const listboxId = `${controlId}-listbox`

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isInvalid = resolveInvalidFlag(invalid, ariaInvalid)

  const selectedOptions = useMemo(
    () => getSelectedDropdownOptions(options, props.value, isMultiple),
    [options, props.value, isMultiple],
  )

  const visibleOptions = useMemo(
    () =>
      searchable ? filterDropdownOptions(options, searchQuery) : [...options],
    [options, searchable, searchQuery],
  )

  useEffect(() => {
    if (!isOpen) return
    function handleOutsidePointerDown(event: MouseEvent) {
      const target = event.target as Node | null
      if (
        target &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutsidePointerDown)
    return () =>
      document.removeEventListener('mousedown', handleOutsidePointerDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchable) {
      searchInputRef.current?.focus()
    }
  }, [isOpen, searchable])

  function openMenu() {
    if (disabled) return
    setIsOpen(true)
    const firstSelectedIndex = visibleOptions.findIndex((option) =>
      isOptionSelected(option.value, props.value, isMultiple),
    )
    setActiveIndex(
      firstSelectedIndex >= 0
        ? firstSelectedIndex
        : getFirstEnabledOptionIndex(visibleOptions),
    )
  }

  function closeMenu(restoreFocus = false) {
    setIsOpen(false)
    setSearchQuery('')
    setActiveIndex(-1)
    if (restoreFocus) {
      triggerRef.current?.focus()
    }
  }

  function toggleMenu() {
    if (disabled) return
    if (isOpen) {
      closeMenu(false)
    } else {
      openMenu()
    }
  }

  function handleOptionSelect(option: DropdownOption<TValue>) {
    if (disabled || option.disabled) return
    if (props.multiple) {
      const nextValues = toggleMultipleValue(option.value, props.value)
      props.onChange(nextValues)
      return
    }
    const nextSingle = coerceSingleValue(option.value, props.value, options)
    props.onChange(nextSingle)
    closeMenu(true)
  }

  function handleClear() {
    if (disabled) return
    if (props.multiple) {
      props.onChange([])
      return
    }
    const emptyOption = options.find((opt) => String(opt.value) === '')
    const fallback = (emptyOption ? emptyOption.value : '') as TValue
    props.onChange(coerceSingleValue(fallback, props.value, options))
    closeMenu(true)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (disabled) return

    if (!isOpen) {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault()
        openMenu()
      }
      return
    }

    switch (event.key) {
      case 'Escape': {
        event.preventDefault()
        event.stopPropagation()
        closeMenu(true)
        break
      }
      case 'ArrowDown': {
        event.preventDefault()
        setActiveIndex((current) =>
          getNextEnabledOptionIndex(visibleOptions, current, 1),
        )
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        setActiveIndex((current) =>
          getNextEnabledOptionIndex(
            visibleOptions,
            current < 0 ? 0 : current,
            -1,
          ),
        )
        break
      }
      case 'Home': {
        event.preventDefault()
        setActiveIndex(getFirstEnabledOptionIndex(visibleOptions))
        break
      }
      case 'End': {
        event.preventDefault()
        setActiveIndex(getLastEnabledOptionIndex(visibleOptions))
        break
      }
      case 'Enter':
      case ' ': {
        if (searchable && event.key === ' ' && document.activeElement === searchInputRef.current) {
          return
        }
        event.preventDefault()
        const targetOption = visibleOptions[activeIndex]
        if (targetOption && !targetOption.disabled) {
          handleOptionSelect(targetOption)
        }
        break
      }
      case 'Tab': {
        closeMenu(false)
        break
      }
    }
  }

  const activeSingleTone =
    !isMultiple && selectedOptions[0]?.tone ? selectedOptions[0].tone : tone
  const resolvedTriggerTone = getToneClass(activeSingleTone)
  const summaryText = formatDropdownSummary(selectedOptions, placeholder)
  const hasSelection = isMultiple
    ? selectedOptions.length > 0
    : selectedOptions.length > 0 && String(selectedOptions[0].value) !== ''

  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ')
  const triggerClasses = [
    styles.trigger,
    size === 'sm' ? styles.sizeSm : null,
    isOpen ? styles.triggerOpen : null,
    resolvedTriggerTone,
    triggerClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const menuClasses = [
    styles.menu,
    align === 'end' ? styles.alignEnd : styles.alignStart,
    menuClassName,
  ]
    .filter(Boolean)
    .join(' ')

  const activeLeadingIcon =
    leadingIcon ?? (!isMultiple ? selectedOptions[0]?.icon : undefined)

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      data-ds-dropdown=""
      onKeyDown={handleKeyDown}
    >
      <select
        tabIndex={-1}
        aria-hidden="true"
        className={styles.nativeSelect}
        name={name}
        multiple={isMultiple || undefined}
        disabled={disabled}
        required={required}
        value={
          isMultiple
            ? props.value.map(String)
            : String(props.value ?? '')
        }
        onChange={(event) => {
          if (disabled) return
          if (props.multiple) {
            const selectedRaw = Array.from(event.currentTarget.selectedOptions).map(
              (item) => item.value,
            )
            const nextValues = options
              .filter((option) => selectedRaw.includes(String(option.value)))
              .map((option) => option.value)
            props.onChange(nextValues)
            return
          }
          const nextValue = coerceSingleValue(
            event.currentTarget.value,
            props.value,
            options,
          )
          props.onChange(nextValue)
        }}
      >
        {isMultiple && options.every((opt) => String(opt.value) !== '') ? null : (
          !options.some((opt) => String(opt.value) === '') && (
            <option value="">{placeholder}</option>
          )
        )}
        {options.map((option) => (
          <option
            key={String(option.value)}
            value={String(option.value)}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      <button
        ref={(node) => {
          triggerRef.current = node
          if (externalTriggerRef) {
            externalTriggerRef.current = node
          }
        }}
        id={controlId}
        type="button"
        data-ds-button=""
        className={triggerClasses}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={isInvalid ? 'true' : undefined}
        aria-required={required || undefined}
        onClick={toggleMenu}
      >
        <span className={styles.triggerMain}>
          {activeLeadingIcon ? (
            <span className={styles.leadingIcon} aria-hidden="true">
              {renderDropdownIcon(activeLeadingIcon)}
            </span>
          ) : null}

          {isMultiple && selectedOptions.length > 0 ? (
            <span className={styles.tagList}>
              {selectedOptions.map((item) => (
                <span key={String(item.value)} className={styles.tag}>
                  <span className={styles.tagLabel}>{item.label}</span>
                </span>
              ))}
            </span>
          ) : (
            <span
              className={`${styles.triggerText} ${
                !hasSelection && selectedOptions.length === 0
                  ? styles.placeholder
                  : ''
              }`}
            >
              {summaryText}
            </span>
          )}
        </span>

        <span className={styles.indicators} aria-hidden="true">
          {isMultiple && selectedOptions.length > 0 ? (
            <span className={styles.countBadge}>{selectedOptions.length}</span>
          ) : null}
          <ChevronDown
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {isOpen && !disabled ? (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable={isMultiple || undefined}
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabel ?? placeholder}
          className={menuClasses}
        >
          {searchable ? (
            <div className={styles.searchBox}>
              <Search className={styles.searchIcon} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                className={styles.searchInput}
                value={searchQuery}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                onChange={(event) => {
                  setSearchQuery(event.currentTarget.value)
                  setActiveIndex(0)
                }}
              />
            </div>
          ) : null}

          {clearable && hasSelection ? (
            <div className={styles.clearAction}>
              <button
                type="button"
                data-ds-button=""
                className={styles.clearButton}
                onClick={handleClear}
              >
                <X size={14} aria-hidden="true" />
                <span>Limpiar selección</span>
              </button>
            </div>
          ) : null}

          {visibleOptions.length > 0 ? (
            <ul className={styles.optionList}>
              {visibleOptions.map((option, index) => {
                const selected = isOptionSelected(
                  option.value,
                  props.value,
                  isMultiple,
                )
                const active = index === activeIndex
                const previousGroup =
                  index > 0 ? visibleOptions[index - 1]?.group : undefined
                const showGroupHeader =
                  Boolean(option.group) && option.group !== previousGroup
                const optionToneClass = getOptionToneClass(option.tone)

                const optionClasses = [
                  styles.option,
                  selected ? styles.optionSelected : null,
                  active ? styles.optionActive : null,
                  option.disabled ? styles.optionDisabled : null,
                  option.startsSection ? styles.optionSection : null,
                  optionToneClass,
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <li key={String(option.value)} role="presentation">
                    {showGroupHeader ? (
                      <div className={styles.groupHeader} role="presentation">
                        {option.group}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      data-ds-button=""
                      aria-selected={selected}
                      disabled={option.disabled}
                      className={optionClasses}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleOptionSelect(option)}
                    >
                      <span className={styles.optionLeading}>
                        {isMultiple ? (
                          <span
                            className={`${styles.checkboxBox} ${
                              selected ? styles.checkboxBoxChecked : ''
                            }`}
                            aria-hidden="true"
                          >
                            {selected ? (
                              <Check size={12} aria-hidden="true" />
                            ) : null}
                          </span>
                        ) : null}

                        {option.icon ? (
                          <span className={styles.optionIcon} aria-hidden="true">
                            {renderDropdownIcon(option.icon)}
                          </span>
                        ) : null}

                        <span className={styles.optionContent}>
                          <span className={styles.optionLabel}>
                            {option.label}
                          </span>
                          {option.description ? (
                            <span className={styles.optionDescription}>
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                      </span>

                      <span className={styles.optionTrailing}>
                        {option.badge ? (
                          <span className={styles.optionBadge}>
                            {option.badge}
                          </span>
                        ) : null}
                        {!isMultiple && selected ? (
                          <Check
                            className={styles.checkIcon}
                            aria-hidden="true"
                          />
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className={styles.emptyState} role="status">
              {emptyText}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

;(
  Dropdown as unknown as {
    __dropdownStaticNode: typeof createDropdownStaticNode
  }
).__dropdownStaticNode = createDropdownStaticNode
