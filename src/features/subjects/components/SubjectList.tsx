import type { Subject } from '@/features/subjects/types/subject.types'

import { SubjectCard } from './SubjectCard'

import styles from './SubjectList.module.css'

interface SubjectListProps {
  subjects: Subject[]
}

export function SubjectList({ subjects }: SubjectListProps) {
  return (
    <section aria-label="Materias asignadas" className={styles.list}>
      {subjects.map((subject) => (
        <SubjectCard key={subject.id} subject={subject} />
      ))}
    </section>
  )
}