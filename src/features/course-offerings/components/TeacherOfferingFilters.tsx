import type { Subject } from '@/features/subjects/types/subject.types'
import { useId } from 'react'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function TeacherOfferingFilters({
  subjects,
  term,
  onChange,
}: {
  subjects: Subject[]
  term: string
  onChange: (value: string) => void
}) {
  const id = useId()
  const terms = [
    ...new Set(subjects.map((subject) => subject.academicManagement)),
  ]
  return (
    <div className={styles.teacherPeriodFilter}>
      <label htmlFor={id}>Periodo académico</label>
      <select
        id={id}
        value={term}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Todos los periodos</option>
        {terms.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}
