import type { Subject } from '@/features/subjects/types/subject.types'

import { SubjectCard } from './SubjectCard'

import styles from './SubjectList.module.css'

interface SubjectListProps {
  subjects: Subject[]
  onAddStudents?: (subject: Subject) => void
  showCreateExam?: boolean
}

export function SubjectList({
  subjects,
  onAddStudents,
  showCreateExam = true,
}: SubjectListProps) {
  return (
    <section aria-label="Materias asignadas" className={styles.list}>
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          onAddStudents={onAddStudents}
          showCreateExam={showCreateExam}
        />
      ))}
    </section>
  )
}