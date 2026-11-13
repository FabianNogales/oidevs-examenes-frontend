import { useId, type ComponentProps, type ReactNode } from 'react'
import styles from './Radio.module.css'

export interface RadioProps extends Omit<ComponentProps<'input'>, 'type'> {
  /** Optional visible label rendered beside the radio input. */
  label?: ReactNode
  /** Optional helper description below the label. */
  description?: ReactNode
  /** Marks the radio invalid (`aria-invalid="true"`). */
  invalid?: boolean
}

/**
 * Global Radio atom: uses native `<input type="radio">` for native arrow-key roving focus
 * and full screen-reader support, styled with Semi-Flat Design 2.0 tokens.
 */
export function Radio({
  id: idProp,
  label,
  description,
  invalid = false,
  disabled = false,
  className,
  ...props
}: RadioProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const descId = description ? `${id}-desc` : undefined
  const describedBy =
    [props['aria-describedby'], descId].filter(Boolean).join(' ') || undefined
  const isInvalid = Boolean(
    invalid ||
      props['aria-invalid'] === true ||
      props['aria-invalid'] === 'true',
  )

  const inputElement = (
    <input
      {...props}
      id={id}
      type="radio"
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
