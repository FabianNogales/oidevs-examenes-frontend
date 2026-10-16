import type { ReactNode } from 'react'
import { ExamCard } from '@/features/exams/components/ExamCard'
import type {
  CollaborationExam,
  MyCollaboration,
} from '../types/collaboration.types'

export function CollaborationExamCard({
  exam,
  asSupport = false,
  children,
}: {
  exam: CollaborationExam | MyCollaboration
  asSupport?: boolean
  children?: ReactNode
}) {
  const cardProps =
    'exam_id' in exam
      ? {
          subjectName: exam.subject_name,
          examName: exam.exam_name,
          examDate: exam.exam_date,
          examTime: exam.start_time,
          durationMinutes: exam.duration_minutes,
          roomName: exam.room,
        }
      : {
          subjectName: exam.subject_name,
          subjectCode: exam.subject_code,
          examName: exam.name,
          examDate: exam.exam_date,
          examTime: exam.start_time,
          durationMinutes: exam.duration_minutes,
          roomName: exam.room?.name,
          roomCode: exam.room?.code,
          evaluationType: exam.evaluation_type,
        }
  return (
    <ExamCard {...cardProps} status={asSupport ? 'APOYO EN EXAMEN' : undefined}>
      {children}
    </ExamCard>
  )
}
