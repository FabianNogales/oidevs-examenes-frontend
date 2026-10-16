import type { EvaluationType } from '@/features/exams/types/exam.types'

export type CollaborationExam = {
  id: number
  name: string
  exam_date: string
  subject_name?: string | null
  subject_code?: string | null
  start_time?: string | null
  duration_minutes?: number | null
  room?: {
    code?: string | null
    name?: string | null
    location?: string | null
  } | null
  evaluation_type?: EvaluationType | null
}

export type MyCollaboration = {
  exam_id: number
  exam_name: string
  subject_name: string
  exam_date: string
  start_time: string
  duration_minutes: number
  room: string
}

export type CollaborationUser = {
  id: number
  display_name: string
  email: string
  identity_number: string
}

export type ExamCollaborator = {
  id: number
  user_id: number
  display_name: string
  email: string
  identity_number: string
  profile_photo_url: string | null
  assigned_at: string
  assigned_by: number
  assigned_by_name: string
}

// Older responses may omit the photo; the API normalizes it to null.
export type ExamCollaboratorsResponse = {
  data: (Omit<ExamCollaborator, 'profile_photo_url'> & {
    profile_photo_url?: string | null
  })[]
}
