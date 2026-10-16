import type {
  AcademicTermFieldErrors,
  CreateAcademicTermPayload,
} from '../types/academicTerm.types'
import styles from './AcademicTermModal.module.css'

export function AcademicTermFields({
  id,
  values,
  errors,
  editing,
  disabled,
  onChange,
}: {
  id: string
  values: CreateAcademicTermPayload
  errors: AcademicTermFieldErrors
  editing: boolean
  disabled: boolean
  onChange: (field: keyof CreateAcademicTermPayload, value: string) => void
}) {
  return (
    <div className={styles.formGrid}>
      {(['name', 'start_date', 'end_date'] as const).map((field) => (
        <div
          className={`${styles.field} ${field === 'name' ? styles.fullWidth : ''}`}
          key={field}
        >
          <label htmlFor={`${id}-${field}`}>
            {field === 'name'
              ? 'Nombre del periodo'
              : field === 'start_date'
                ? 'Fecha de inicio'
                : 'Fecha de fin'}{' '}
            *
          </label>
          <input
            id={`${id}-${field}`}
            name={field}
            type={field === 'name' ? 'text' : 'date'}
            required
            value={values[field]}
            disabled={disabled}
            placeholder={field === 'name' ? 'Ej.: I/2027' : undefined}
            min={field === 'name' ? undefined : '0001-01-01'}
            max={field === 'name' ? undefined : '9999-12-31'}
            aria-invalid={Boolean(errors[field])}
            aria-describedby={`${id}-${field}-help${errors[field] ? ` ${id}-${field}-error` : ''}`}
            onChange={(event) => onChange(field, event.target.value)}
          />
          <small id={`${id}-${field}-help`}>
            {field === 'name'
              ? 'Nombre único de 2 a 255 caracteres.'
              : field === 'start_date'
                ? 'Primer día del periodo.'
                : 'Último día del periodo, incluido.'}
          </small>
          {errors[field] && (
            <small id={`${id}-${field}-error`} className={styles.fieldError}>
              {errors[field]}
            </small>
          )}
        </div>
      ))}
      {!editing && (
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label htmlFor={`${id}-status`}>Estado inicial *</label>
          <select
            id={`${id}-status`}
            name="status"
            value={values.status}
            disabled={disabled}
            aria-invalid={Boolean(errors.status)}
            aria-describedby={`${id}-status-help${errors.status ? ` ${id}-status-error` : ''}`}
            onChange={(event) => onChange('status', event.target.value)}
          >
            <option value="INACTIVE">Inactivo</option>
            <option value="ACTIVE">Activo</option>
          </select>
          <small id={`${id}-status-help`}>
            Solo puede haber un periodo activo. Activar este periodo no
            desactiva otro automáticamente.
          </small>
          {errors.status && (
            <small id={`${id}-status-error`} className={styles.fieldError}>
              {errors.status}
            </small>
          )}
        </div>
      )}
    </div>
  )
}
