import type { Subject } from '@/features/subjects/types/subject.types'
import { useId } from 'react'
import { Dropdown } from '@/shared/components/ui/Dropdown'
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
      <Dropdown
        id={id}
        value={term}
        options={[
          { value: '', label: 'Todos los periodos' },
          ...terms.map((name) => ({
            value: name,
            label: name,
          })),
        ]}
        onChange={(nextTerm) => onChange(nextTerm)}
      />
    </div>
  )
}
