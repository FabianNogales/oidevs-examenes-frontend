import { useId, type ComponentProps, type ReactNode } from 'react'
import styles from './Checkbox.module.css'

export interface CheckboxProps
  extends Omit<ComponentProps<'input'>, 'type'> {
  /** Optional visible label rendered beside the checkbox. */
  label?: ReactNode
  /** Optional helper description below the label. */
  description?: ReactNode
  /** Marks the checkbox invalid (`aria-invalid="true"`). */
  invalid?: boolean
}

/**
 * Global Checkbox atom: uses native `<input type="checkbox">` for full keyboard (Space)
 * and assistive technology support, styled with Semi-Flat Design 2.0 tokens.
 */
export function Checkbox({
  id: idProp,
  label,
  description,
  invalid = false,
  disabled = false,
  className,
  ...props
}: CheckboxProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const descId = description ? `${id}-desc` : undefined
  const describedBy =
    [props['aria-describedby'], descId].filter(Boolean).join(' ') || undefined
  const isInvalid = Boolean(invalid || props['aria-invalid'] === true || props['aria-invalid'] === 'true')

  const inputElement = (
    <input
      {...props}
      id={id}
      type="checkbox"
      disabled={disabled}
      aria-invalid={isInvalid ? 'true' : undefined}
      aria-describedby={describedBy}
      className={[styles.input, !label ? className : null]
        .filter(Boolean)
        .join(' ')}
    />
  )

  if (!label && !description) {
    return inputElement
  }

  return (
    <label
      htmlFor={id}
      className={[
        styles.wrapper,
        disabled ? styles.disabled : null,
        isInvalid ? styles.invalid : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {inputElement}
      <span className={styles.textGroup}>
        {label ? <span className={styles.label}>{label}</span> : null}
        {description ? (
          <span id={descId} className={styles.description}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}
