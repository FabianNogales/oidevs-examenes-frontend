import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  Field,
  type FieldControlProps,
  type FieldProps,
} from '../Field/Field'
import styles from '../Field/Field.module.css'

export interface FormFieldProps extends Omit<FieldProps, 'children'> {
  /**
   * Either a render function `(control: FieldControlProps) => ReactNode`
   * or a single React element that accepts `id`, `required`, `aria-invalid`, and `aria-describedby`.
   */
  children: ((control: FieldControlProps) => ReactNode) | ReactElement
}

/**
 * Global FormField molecule: groups Label + Input/Select/Dropdown + helper hint + validation error.
 * Automatically links `aria-describedby` to the hint and error ids and sets `aria-invalid` on error.
 */
export function FormField({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId()

  if (typeof children === 'function') {
    return (
      <Field
        label={label}
        htmlFor={htmlFor}
        required={required}
        hint={hint}
        error={error}
        className={className}
      >
        {children}
      </Field>
    )
  }

  const childProps = isValidElement(children)
    ? (children.props as Record<string, unknown>)
    : {}
  const id =
    htmlFor ??
    (typeof childProps.id === 'string' && childProps.id.length > 0
      ? childProps.id
      : generatedId)
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy =
    [
      typeof childProps['aria-describedby'] === 'string'
        ? childProps['aria-describedby']
        : undefined,
      hintId,
      errorId,
    ]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<Record<string, unknown>>,
            {
              id,
              ...(required ? { required: true } : {}),
              ...(error ? { 'aria-invalid': true } : {}),
              ...(describedBy ? { 'aria-describedby': describedBy } : {}),
            },
          )
        : children}
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { Field, type FieldControlProps, type FieldProps }
