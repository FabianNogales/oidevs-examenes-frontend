import type { Subject } from '@/features/subjects/types/subject.types'

import { SubjectCard } from './SubjectCard'

import styles from './SubjectList.module.css'

interface SubjectListProps {
  subjects: Subject[]
  onAddStudents?: (subject: Subject) => void
  onCreateExam?: (subject: Subject) => void
  showCreateExam?: boolean
}

export function SubjectList({
  subjects,
  onAddStudents,
  onCreateExam,
  showCreateExam = true,
}: SubjectListProps) {
  return (
    <section aria-label="Materias asignadas" className={styles.list}>
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.courseOfferingId}
          subject={subject}
          onAddStudents={onAddStudents}
          onCreateExam={onCreateExam}
          showCreateExam={showCreateExam}
        />
      ))}
    </section>
  )
}