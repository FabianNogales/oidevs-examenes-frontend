export type EvaluationType = 'partial' | 'final' | 'makeup' | 'recovery'

export type CreateExamPayload = {
  name: string
  exam_date: string
  start_time: string
  duration_minutes: number
  room_id: number
  evaluation_type: EvaluationType
  partial_number?: number | null
  additional_room_ids?: number[]
  rules?: string | null
}

export type RoomBusySlot = {
  exam_id?: number
  exam_name?: string
  date?: string
  start: string
  end: string
  is_shared?: boolean
}

export type Room = {
  id: number
  code: string
  name: string
  location?: string | null
  floor?: string | null
  capacity?: number | null
  status?: string
  busy_slots?: RoomBusySlot[]
  schedules_list?: RoomBusySlot[]
}

export type OfferingAcademicTermMeta = {
  id: number
  name: string
  start_date: string
  end_date: string
}

export type OfferingSchedulingMeta = {
  next_partial_number: number
  last_partial_number: number
  enrolled_students_count: number
  eligible_students_count: number
  safety_margin: number
  recommended_capacity: number
  academic_term?: OfferingAcademicTermMeta | null
}

export type RoomsResponse = {
  data: Room[]
  meta?: OfferingSchedulingMeta | null
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
  start_time?: string | null
  duration_minutes?: number | null
  room?: {
    id: number
    code: string
    name: string
  } | null
  evaluation_type?: EvaluationType | null
  status?: string | null
}

export type TeacherUpcomingExamsResponse = {
  data: TeacherUpcomingExamDto[]
}

export type ExamCreateResponse = {
  message: string
  data: Exam
}