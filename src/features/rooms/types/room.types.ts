export type RoomStatus = 'ACTIVE' | 'INACTIVE'
export type RoomAvailability = 'AVAILABLE' | 'OCCUPIED' | 'UNKNOWN'

export interface RoomExam {
  id: number
  name: string
  exam_date: string
  start_time: string
  end_time: string
}

export interface Room {
  id: number
  code: string
  name: string | null
  location: string | null
  description?: string | null
  capacity?: number | null
  floor?: string | null
  status: RoomStatus
  availability?: RoomAvailability
  current_exam?: RoomExam | null
}

export interface RoomsResponse {
  data: Room[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

export interface RoomsQuery {
  page: number
  search: string
  status: RoomStatus | ''
}

export interface RoomFormValues {
  code: string
  name: string
  location: string
  description: string
  capacity: string
  floor: string
}

export type RoomField = keyof RoomFormValues
export type RoomFieldErrors = Partial<Record<RoomField, string>>

export interface RoomPayload {
  code: string
  name: string
  location: string | null
  description: string | null
  capacity: number | null
  floor: string | null
}

export interface RoomResponse {
  data: Room
}

export type RoomDialogSelection =
  { mode: 'create' } | { mode: 'detail' | 'edit'; roomId: number }
