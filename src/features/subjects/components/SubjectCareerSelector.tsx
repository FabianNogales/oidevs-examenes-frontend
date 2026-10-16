import type { SubjectCareer } from '../types/adminSubject.types'
import styles from './SubjectDialog.module.css'

export function SubjectCareerSelector({
  id,
  options,
  originalIds,
  selected,
  loaded,
  error,
  disabled,
  onChange,
}: {
  id: string
  options: SubjectCareer[]
  originalIds: Set<number>
  selected: number[]
  loaded: boolean
  error?: string
  disabled: boolean
  onChange: (ids: number[]) => void
}) {
  const available = options.filter(
    (career) => career.status === 'ACTIVE' || originalIds.has(career.id),
  )
  return (
    <fieldset
      className={`${styles.fullWidth} ${styles.careerField}`}
      disabled={disabled}
      aria-describedby={error ? `${id}-careers-error` : undefined}
    >
      <legend>Carreras *</legend>
      {!loaded && <p role="status">Cargando carreras…</p>}
      {loaded && (
        <div className={styles.careerOptions}>
          {available.map((career) => (
            <label className={styles.careerOption} key={career.id}>
              <input
                type="checkbox"
                name="career_ids"
                value={career.id}
                checked={selected.includes(career.id)}
                aria-invalid={Boolean(error)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, career.id]
                      : selected.filter((value) => value !== career.id),
                  )
                }
              />
              <span>
                {career.name}
                {career.status === 'INACTIVE'
                  ? ' (inactiva, asociación existente)'
                  : ''}
              </span>
            </label>
          ))}
          {!available.length && (
            <p className={styles.help}>
              No hay carreras activas disponibles. Registra una carrera antes de
              continuar.
            </p>
          )}
        </div>
      )}
      {error && (
        <p className={styles.fieldError} id={`${id}-careers-error`}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
