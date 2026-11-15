import { Eye, EyeOff, Lock } from 'lucide-react'
import { AuthField } from '@/features/auth/components/AuthField'

type PasswordInputProps = {
  id: string
  name: string
  label: string
  value: string
  error?: string
  autoComplete: string
  disabled: boolean
  isVisible: boolean
  onVisibilityChange: () => void
  onChange: (value: string) => void
  onBlur?: () => void
}

export function PasswordInput({
  id,
  name,
  label,
  value,
  error,
  autoComplete,
  disabled,
  isVisible,
  onVisibilityChange,
  onChange,
  onBlur,
}: PasswordInputProps) {
  return (
    <AuthField
      id={id}
      name={name}
      label={label}
      className="auth-password-control"
      type={isVisible ? 'text' : 'password'}
      autoComplete={autoComplete}
      value={value}
      error={error}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      icon={<Lock aria-hidden="true" />}
      action={
        <button
          className="auth-field__icon-button"
          type="button"
          onClick={onVisibilityChange}
          disabled={disabled}
          aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={isVisible}
        >
          {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      }
      required
    />
  )
}
