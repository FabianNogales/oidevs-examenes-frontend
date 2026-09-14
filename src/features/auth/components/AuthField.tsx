import type { InputHTMLAttributes, ReactNode } from 'react'

type AuthFieldProps = {
  id: string
  label: string
  error?: string
  icon?: ReactNode
  action?: ReactNode
} & InputHTMLAttributes<HTMLInputElement>

export function AuthField({
  id,
  label,
  error,
  icon,
  action,
  className,
  ...inputProps
}: AuthFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className={`auth-field__control ${className ?? ''}`}>
        {icon ? <span className="auth-field__icon">{icon}</span> : null}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {action ? <span className="auth-field__action">{action}</span> : null}
      </div>
      {error ? (
        <p className="auth-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
