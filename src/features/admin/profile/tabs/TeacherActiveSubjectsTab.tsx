import { TeacherCourseOfferings } from '@/features/course-offerings/components/TeacherCourseOfferings'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function TeacherActiveSubjectsTab({ entity }: ProfileTabComponentProps) {
  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Materias que dicta</h2>
      <TeacherCourseOfferings teacherId={Number(entity.id)} />
    </section>
  )
}