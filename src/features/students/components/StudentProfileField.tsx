import styles from './StudentProfileField.module.css'

interface StudentProfileFieldProps {
  label: string
  value?: string | null
  fallback?: string
}

export function StudentProfileField({
  label,
  value,
  fallback = 'No registrado',
}: StudentProfileFieldProps) {
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>{value?.trim() || fallback}</dd>
    </div>
  )
}
