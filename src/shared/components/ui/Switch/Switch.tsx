import { useId, type ComponentProps, type ReactNode } from 'react'
import styles from './Switch.module.css'

export interface SwitchProps extends Omit<ComponentProps<'input'>, 'type'> {
  /** Optional visible label rendered beside the switch. */
  label?: ReactNode
  /** Optional helper description below the label. */
  description?: ReactNode
  /** Marks the switch invalid (`aria-invalid="true"`). */
  invalid?: boolean
}

/**
 * Global Switch atom: uses native `<input type="checkbox" role="switch">` for full keyboard
 * and assistive technology support, styled with Semi-Flat Design 2.0 tokens.
 */
export function Switch({
  id: idProp,
  label,
  description,
  invalid = false,
  disabled = false,
  className,
  ...props
}: SwitchProps) {
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
      <span className={styles.control}>
        <input
          {...props}
          id={id}
          type="checkbox"
          role="switch"
          disabled={disabled}
          aria-invalid={isInvalid ? 'true' : undefined}
          aria-describedby={describedBy}
          className={styles.input}
        />
        <span className={styles.track} aria-hidden="true">
          <span className={styles.thumb} />
        </span>
      </span>
      {label || description ? (
        <span className={styles.textGroup}>
          {label ? <span className={styles.label}>{label}</span> : null}
          {description ? (
            <span id={descId} className={styles.description}>
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  )
}
