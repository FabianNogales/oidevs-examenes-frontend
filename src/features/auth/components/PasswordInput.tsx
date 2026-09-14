import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from '@/features/auth/components/AuthIcons'
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
      type={isVisible ? 'text' : 'password'}
      autoComplete={autoComplete}
      value={value}
      error={error}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      icon={<LockIcon />}
      action={
        <button
          className="auth-field__icon-button"
          type="button"
          onClick={onVisibilityChange}
          disabled={disabled}
          aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
      required
    />
  )
}
