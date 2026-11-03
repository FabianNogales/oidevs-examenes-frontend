export type AttendanceQuery = {
  view: 'all' | 'registered' | 'pending'
  search: string
  page: number
  list_id?: number
}
export type AttendanceCounts = {
  total_students: number
  registered: number
  pending: number
  attendance_percentage: number
}
export type AttendanceList = AttendanceCounts & {
  id: number
  name: string
  collaborator: { id: number; name: string }
}
export type AttendanceStudent = {
  student_id: number
  first_names: string
  last_names: string
  sis_code: string
  identity_number: string | null
  student_status: string
  attendance_status: 'SERVER_CONFIRMED' | 'PENDING'
  entry: null | {
    id: number
    entered_at: string
    verified_by: number
    verification_method: string
  }
}
export type AttendanceSnapshot = {
  exam: { id: number; name: string; status: string }
  summary: AttendanceCounts
  roster_scope: 'ACTIVE_ENROLLMENTS'
  source: 'SERVER'
  is_current: true
  poll_after_seconds: number
  last_updated_at: string
  offline: {
    available_on_server: boolean
    pending_count: number | null
    included_in_official_attendance: false
  }
  exclusive_lists: {
    available: boolean
    reason?: string
    data?: AttendanceList[]
  }
  selected_list?: AttendanceList | null
}
export type AttendancePage = AttendanceSnapshot & {
  data: AttendanceStudent[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
export type AttendanceCollaborator = {
  user_id: number
  name: string
  role: 'RESPONSIBLE_TEACHER' | 'COLLABORATOR' | 'HISTORICAL_VERIFIER'
  assignment_status: string | null
  valid_registered: number
  assigned_total: number | null
  pending: number | null
  attendance_percentage: number | null
  progress_unavailable_reason?: string
}
export type AttendanceActivity = AttendanceSnapshot & {
  collaborators: {
    available: boolean
    metric: 'VALID_ENTRIES_VERIFIED_BY_USER'
    progress_by_assigned_list_available: boolean
    data: AttendanceCollaborator[]
  }
}
