import { Dropdown } from '@/shared/components/ui/Dropdown/Dropdown'
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
          {available.length > 0 ? (
            <Dropdown<number>
              id={`${id}-careers`}
              name="career_ids"
              multiple
              value={selected}
              disabled={disabled}
              invalid={Boolean(error)}
              aria-describedby={error ? `${id}-careers-error` : undefined}
              placeholder="Selecciona una o más carreras"
              options={available.map((career) => ({
                value: career.id,
                label: `${career.name}${
                  career.status === 'INACTIVE'
                    ? ' (inactiva, asociación existente)'
                    : ''
                }`,
              }))}
              onChange={onChange}
            />
          ) : (
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
