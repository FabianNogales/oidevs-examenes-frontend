export type EvaluationType = 'partial' | 'final' | 'makeup'

export type CreateExamPayload = {
  name: string
  exam_date: string
  start_time: string
  duration_minutes: number
  room_id: number
  evaluation_type: EvaluationType
  rules?: string | null
}

export type Room = {
  id: number
  code: string
  name: string
  location?: string | null
  status?: string
}

export type RoomsResponse = {
  data: Room[]
}

export type Exam = {
  id: number
  course_offering_id: number
  room_id: number
  evaluation_type: EvaluationType
  name: string
  exam_date: string
  start_time: string
  duration_minutes: number
  rules: string | null
  status: string
  created_by: number
  created_at: string
  updated_at: string
}

export type TeacherUpcomingExamDto = {
  id: number
  name: string
  subject_code: string
  subject_name: string
  exam_date: string
  start_time: string
  duration_minutes: number
  room: {
    id: number
    code: string
    name: string
  }
  evaluation_type: EvaluationType
  status: string
}

export type TeacherUpcomingExamsResponse = {
  data: TeacherUpcomingExamDto[]
}

export type ExamCreateResponse = {
  message: string
  data: Exam
}
