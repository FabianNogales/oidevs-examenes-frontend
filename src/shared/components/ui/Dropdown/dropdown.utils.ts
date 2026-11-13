import type {
  DropdownOption,
  DropdownProps,
  DropdownValue,
} from './dropdown.types'

export function isSameDropdownValue(a: DropdownValue, b: DropdownValue): boolean {
  return String(a) === String(b)
}

export function isOptionSelected<TValue extends DropdownValue>(
  optionValue: TValue,
  selectedValue: TValue | readonly TValue[],
  multiple: boolean,
): boolean {
  if (multiple && Array.isArray(selectedValue)) {
    return selectedValue.some((item) => isSameDropdownValue(item, optionValue))
  }
  return isSameDropdownValue(optionValue, selectedValue as TValue)
}

export function getSelectedDropdownOptions<TValue extends DropdownValue>(
  options: readonly DropdownOption<TValue>[],
  selectedValue: TValue | readonly TValue[],
  multiple: boolean,
): DropdownOption<TValue>[] {
  return options.filter((option) =>
    isOptionSelected(option.value, selectedValue, multiple),
  )
}

export function coerceSingleValue<TValue extends DropdownValue>(
  nextRaw: DropdownValue,
  currentValue: TValue,
  options: readonly DropdownOption<TValue>[],
): TValue {
  if (typeof currentValue === 'string') {
    return String(nextRaw) as TValue
  }
  if (typeof currentValue === 'number') {
    const matched = options.find((opt) => isSameDropdownValue(opt.value, nextRaw))
    if (matched && typeof matched.value === 'number') {
      return matched.value
    }
    const parsed = Number(nextRaw)
    return (Number.isNaN(parsed) ? nextRaw : parsed) as TValue
  }
  const matched = options.find((opt) => isSameDropdownValue(opt.value, nextRaw))
  return (matched ? matched.value : nextRaw) as TValue
}

export function toggleMultipleValue<TValue extends DropdownValue>(
  optionValue: TValue,
  currentValues: readonly TValue[],
): TValue[] {
  const exists = currentValues.some((item) =>
    isSameDropdownValue(item, optionValue),
  )
  if (exists) {
    return currentValues.filter(
      (item) => !isSameDropdownValue(item, optionValue),
    )
  }
  return [...currentValues, optionValue]
}

export function filterDropdownOptions<TValue extends DropdownValue>(
  options: readonly DropdownOption<TValue>[],
  query: string,
): DropdownOption<TValue>[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return [...options]
  return options.filter((option) => {
    const inLabel = option.label.toLowerCase().includes(normalized)
    const inDescription =
      option.description?.toLowerCase().includes(normalized) ?? false
    const inGroup = option.group?.toLowerCase().includes(normalized) ?? false
    const inBadge = option.badge?.toLowerCase().includes(normalized) ?? false
    return inLabel || inDescription || inGroup || inBadge
  })
}

export function getFirstEnabledOptionIndex<TValue extends DropdownValue>(
  options: readonly DropdownOption<TValue>[],
): number {
  return options.findIndex((option) => !option.disabled)
}

export function getLastEnabledOptionIndex<TValue extends DropdownValue>(
  options: readonly DropdownOption<TValue>[],
): number {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index].disabled) return index
  }
  return -1
}

export function getNextEnabledOptionIndex<TValue extends DropdownValue>(
  options: readonly DropdownOption<TValue>[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (!options.length) return -1
  const total = options.length
  let cursor = currentIndex
  for (let step = 0; step < total; step += 1) {
    cursor = (cursor + direction + total) % total
    if (!options[cursor]?.disabled) {
      return cursor
    }
  }
  return -1
}

export function formatDropdownSummary<TValue extends DropdownValue>(
  selectedOptions: readonly DropdownOption<TValue>[],
  placeholder = 'Selecciona una opción',
): string {
  if (selectedOptions.length === 0) {
    return placeholder
  }
  return selectedOptions.map((option) => option.label).join(', ')
}

export function resolveInvalidFlag(
  invalid?: boolean,
  ariaInvalid?: boolean | 'true' | 'false',
): true | undefined {
  if (invalid || ariaInvalid === true || ariaInvalid === 'true') {
    return true
  }
  return undefined
}

/**
 * Representación estática ligera para arneses de prueba sin DOM completo
 * que inspeccionan nodos <select> y <option> sin ejecutar hooks hijos.
 */
export function createDropdownStaticNode<TValue extends DropdownValue>(
  props: DropdownProps<TValue>,
) {
  const isInvalid = resolveInvalidFlag(props.invalid, props['aria-invalid'])
  const optionNodes = props.options.map((option) => ({
    type: 'option',
    key: String(option.value),
    props: {
      value: option.value,
      disabled: option.disabled,
      children: option.label,
    },
  }))

  const resolvedMulti = props.multiple
    ? (props.value ?? props.defaultValue ?? [])
    : []
  const resolvedSingle = !props.multiple
    ? (props.value ?? props.defaultValue ?? (props.options[0]?.value ?? ('' as TValue)))
    : ('' as TValue)

  return {
    type: 'select',
    key: null,
    props: {
      ref: props.triggerRef,
      id: props.id,
      name: props.name,
      multiple: props.multiple || undefined,
      disabled: props.disabled,
      required: props.required,
      value: props.multiple ? resolvedMulti.map(String) : resolvedSingle,
      'aria-label': props['aria-label'],
      'aria-labelledby': props['aria-labelledby'],
      'aria-describedby': props['aria-describedby'],
      'aria-invalid': isInvalid ? 'true' : undefined,
      children: optionNodes,
      onChange: (eventOrValue: unknown) => {
        if (props.disabled) return
        const target =
          eventOrValue &&
          typeof eventOrValue === 'object' &&
          ('target' in eventOrValue || 'currentTarget' in eventOrValue)
            ? ((
                eventOrValue as {
                  target?: { value?: unknown; selectedOptions?: Array<{ value: unknown }> }
                  currentTarget?: { value?: unknown; selectedOptions?: Array<{ value: unknown }> }
                }
              ).target ??
              (
                eventOrValue as {
                  currentTarget?: { value?: unknown; selectedOptions?: Array<{ value: unknown }> }
                }
              ).currentTarget)
            : undefined

        if (props.multiple) {
          if (target?.selectedOptions) {
            const selectedRaw = Array.from(target.selectedOptions).map((item) =>
              String(item.value),
            )
            const nextValues = props.options
              .filter((option) => selectedRaw.includes(String(option.value)))
              .map((option) => option.value)
            props.onChange?.(nextValues)
            return
          }
          const rawValue = (target ? target.value : eventOrValue) as TValue
          props.onChange?.(toggleMultipleValue(rawValue, resolvedMulti))
          return
        }

        const rawSingle = (target ? target.value : eventOrValue) as DropdownValue
        const nextSingle = coerceSingleValue<TValue>(
          rawSingle,
          resolvedSingle,
          props.options,
        )
        props.onChange?.(nextSingle)
      },
    },
  }
}
